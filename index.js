/**
 * Host half of dsh-read-doc.
 *
 * The browser half cannot read arbitrary files, so this half exposes two
 * same-origin, loopback-only read endpoints under /read-doc/api. Both resolve
 * through the composed filesystem and refuse every target outside a registered
 * Workspace. Nothing here mutates a workspace.
 */

import path from 'node:path'

export const inject = ['webServer']

const API_ROOT = '/read-doc/api'
const MAX_TEXT_BYTES = 4 * 1024 * 1024
const MAX_ENTRIES = 10000

export function apply(ctx) {
  ctx.effect(
    () => ctx.webServer.register({
      kind: 'exact',
      path: `${API_ROOT}/list`,
      handler: (req, res) => {
        void guarded(res, () => handleList(ctx, req, res))
      },
    }),
    'read-doc: list route',
  )

  ctx.effect(
    () => ctx.webServer.register({
      kind: 'exact',
      path: `${API_ROOT}/read`,
      handler: (req, res) => {
        void guarded(res, () => handleRead(ctx, req, res))
      },
    }),
    'read-doc: read route',
  )
}

async function guarded(res, operation) {
  try {
    await operation()
  } catch (error) {
    if (!res.headersSent) {
      sendJson(res, 500, {
        ok: false,
        error: {
          code: 'E_INTERNAL',
          message: error instanceof Error ? error.message : String(error),
        },
      })
    } else {
      try {
        res.end()
      } catch {
        /* the response is already gone */
      }
    }
  }
}

async function handleList(ctx, req, res) {
  if (!allowRequest(ctx, req, res)) return
  if (req.method !== 'GET') {
    sendJson(res, 405, failure('E_METHOD', 'Use GET.'))
    return
  }
  if (!ctx.get('fs') || !ctx.get('workspaceRegistry')) {
    sendJson(res, 503, failure('E_UNAVAILABLE', 'The filesystem or workspace registry is unavailable.'))
    return
  }

  const url = new URL(req.url ?? '/', 'http://localhost')
  const requested = String(url.searchParams.get('path') ?? '').trim()
  if (requested === '') {
    sendJson(res, 400, failure('E_PATH', 'path is required.'))
    return
  }

  const fs = ctx.get('fs')
  const roots = await workspaceRoots(ctx)
  if (roots.length === 0) {
    sendJson(res, 409, failure('E_NO_WORKSPACE', 'No workspace is registered.'))
    return
  }

  let target
  try {
    target = await fs.resolve(requested)
  } catch (error) {
    sendJson(res, 404, failure('E_NOT_FOUND', error instanceof Error ? error.message : String(error)))
    return
  }

  const owner = ownerOf(fs, roots, target)
  if (owner === undefined) {
    sendJson(res, 403, failure('E_FORBIDDEN', 'The path is outside every registered workspace.'))
    return
  }

  const info = await fs.stat(target)
  if (info === undefined) {
    sendJson(res, 404, failure('E_NOT_FOUND', 'The directory does not exist.'))
    return
  }
  if (info.type !== 'directory') {
    sendJson(res, 400, failure('E_NOT_DIRECTORY', 'The path is not a directory.'))
    return
  }

  const entries = await fs.listDir(target)
  const rows = entries.slice(0, MAX_ENTRIES).map((entry) => {
    const childPath = entry.target.displayPath
    return {
      name: entry.name,
      path: childPath,
      relative: relativePath(owner.displayPath, childPath),
      type: entry.type,
      size: typeof entry.size === 'number' ? entry.size : null,
    }
  })

  sendJson(res, 200, {
    ok: true,
    path: target.displayPath,
    workspace: owner.workspace.path,
    truncated: entries.length > MAX_ENTRIES,
    limit: MAX_ENTRIES,
    entries: rows,
  })
}

async function handleRead(ctx, req, res) {
  if (!allowRequest(ctx, req, res)) return
  if (req.method !== 'GET') {
    sendJson(res, 405, failure('E_METHOD', 'Use GET.'))
    return
  }
  if (!ctx.get('fs') || !ctx.get('workspaceRegistry')) {
    sendJson(res, 503, failure('E_UNAVAILABLE', 'The filesystem or workspace registry is unavailable.'))
    return
  }

  const url = new URL(req.url ?? '/', 'http://localhost')
  const requested = String(url.searchParams.get('path') ?? '').trim()
  if (requested === '') {
    sendJson(res, 400, failure('E_PATH', 'path is required.'))
    return
  }

  const fs = ctx.get('fs')
  const roots = await workspaceRoots(ctx)
  if (roots.length === 0) {
    sendJson(res, 409, failure('E_NO_WORKSPACE', 'No workspace is registered.'))
    return
  }

  let target
  try {
    target = await fs.resolve(requested)
  } catch (error) {
    sendJson(res, 404, failure('E_NOT_FOUND', error instanceof Error ? error.message : String(error)))
    return
  }

  const owner = ownerOf(fs, roots, target)
  if (owner === undefined) {
    sendJson(res, 403, failure('E_FORBIDDEN', 'The path is outside every registered workspace.'))
    return
  }

  const info = await fs.stat(target)
  if (info === undefined) {
    sendJson(res, 404, failure('E_NOT_FOUND', 'The file does not exist.'))
    return
  }
  if (info.type !== 'file') {
    sendJson(res, 400, failure('E_NOT_FILE', 'The path is not a regular file.'))
    return
  }
  if (typeof info.size === 'number' && info.size > MAX_TEXT_BYTES) {
    sendJson(res, 413, failure('E_TOO_LARGE', `The file is larger than ${MAX_TEXT_BYTES} bytes.`))
    return
  }

  let text
  try {
    text = await fs.readText(target)
  } catch (error) {
    sendJson(res, 415, failure('E_BINARY', error instanceof Error ? error.message : String(error)))
    return
  }

  sendJson(res, 200, {
    ok: true,
    path: target.displayPath,
    workspace: owner.workspace.path,
    size: typeof info.size === 'number' ? info.size : null,
    lines: countLines(text),
    text,
  })
}

async function workspaceRoots(ctx) {
  const registry = ctx.get('workspaceRegistry')
  const fs = ctx.get('fs')
  const items = registry.list()
  const roots = await Promise.all(items.map(async (workspace) => {
    try {
      const target = await fs.resolve(workspace.path)
      return {
        workspace,
        root: target,
        displayPath: target.displayPath || workspace.path,
      }
    } catch {
      return undefined
    }
  }))
  return roots
    .filter((root) => root !== undefined)
    .sort((left, right) => right.displayPath.length - left.displayPath.length)
}

function ownerOf(fs, roots, target) {
  for (const root of roots) {
    try {
      if (fs.contains(root.root, target)) return root
    } catch {
      /* an unusable root cannot own this target */
    }
  }
  return undefined
}

function relativePath(root, target) {
  const relative = path.relative(root, target)
  if (relative === '') return ''
  return relative.split(path.sep).join('/')
}

function allowRequest(ctx, req, res) {
  const remote = String(req.socket?.remoteAddress ?? '')
  if (remote !== '' && !isLoopback(remote)) {
    sendJson(res, 403, failure('E_FORBIDDEN', 'Only loopback callers may read workspace files.'))
    return false
  }

  const origin = req.headers.origin
  if (typeof origin === 'string' && origin !== '') {
    let expected
    try {
      expected = ctx.webServer.getOrigin()
    } catch {
      expected = undefined
    }
    let expectedOrigin = expected
    if (typeof expected === 'string' && expected !== '') {
      try {
        expectedOrigin = new URL(expected).origin
      } catch {
        expectedOrigin = expected
      }
    }
    if (expectedOrigin !== undefined && origin !== expectedOrigin) {
      sendJson(res, 403, failure('E_FORBIDDEN', 'Cross-origin reads are refused.'))
      return false
    }
  }

  const site = req.headers['sec-fetch-site']
  if (typeof site === 'string' && site !== '' && site !== 'same-origin' && site !== 'none') {
    sendJson(res, 403, failure('E_FORBIDDEN', 'Cross-site reads are refused.'))
    return false
  }

  return true
}

function isLoopback(address) {
  return address === '::1'
    || address === '127.0.0.1'
    || address === '::ffff:127.0.0.1'
    || address.startsWith('127.')
}

function countLines(text) {
  if (text === '') return 0
  let lines = 1
  for (let index = 0; index < text.length; index += 1) {
    if (text.charCodeAt(index) === 10) lines += 1
  }
  return lines
}

function failure(code, message) {
  return { ok: false, error: { code, message } }
}

function sendJson(res, status, body) {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  })
  res.end(payload)
}
