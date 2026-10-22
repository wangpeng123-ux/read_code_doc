/**
 * Browser half of dsh-read-doc.
 *
 * Adds a right-sidebar file tab that lists every registered Workspace and its
 * tree, opens files through the shipped document preview, and turns a preview
 * text selection into a clickable composer reference with a line range.
 */

window.__ModuleLoader__.load({
  id: '@local/dsh-read-doc',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const {
      Fragment,
      useCallback,
      useEffect,
      useRef,
      useState,
    } = React

    const KIND = 'read-doc-files'
    const ID = '@local/dsh-read-doc'
    const NS = 'read-doc'
    const API = '/read-doc/api'
    const DRAG_MIME = 'application/x-dsh-read-doc-file'
    const QUOTE_PREFIX = 'read-doc-quote:v1:'
    const QUOTE_SOURCE = 'read-doc-quote'

    const zh = {
      meta: {
        title: '工作区文件',
        description: '查看当前工作区的全部文件，拖入对话引用，使用 DSH 编辑器查看并引用选中行。',
      },
      files: {
        tabTitle: '工作区文件',
        currentWorkspace: '当前工作区',
        noCurrentWorkspace: '当前会话没有匹配的工作区文件夹。',
        guideTitle: '工作区文件',
        guideDescription: '查看当前工作区的全部文件；拖入对话框引用，点击交给 DSH 编辑器打开。',
        refresh: '刷新',
        hint: '拖文件到输入框即可引用 · 点击文件用 DSH 编辑器打开 · 在编辑器中选中文本后右键引用行范围',
        loading: '加载中…',
        emptyDir: '空文件夹',
        noSession: '这个工作区还没有会话，无法使用 DSH 编辑器打开文件。请先在此工作区开始一个会话。',
        noEditor: 'DSH 编辑器当前不可用，无法打开文件预览。',
        openFailed: '打开文件失败：{message}',
        listFailed: '读取文件夹失败：{message}',
        readFailed: '读取文件失败：{message}',
        retry: '重试',
        sessions: '{count} 个会话',
        dragTitle: '拖到对话框引用 {path}',
        openTitle: '在 DSH 编辑器中打开 {path}',
        pathLabel: '路径',
        truncated: '文件夹条目过多，只显示前 {count} 项。',
        current: '当前',
      },
      quote: {
        action: '引用选区',
        title: '把选中的文件内容引用到对话框',
        quote: '引用到对话框',
        copy: '复制选中内容',
        copied: '已复制',
        done: '已引用到对话框',
        noSelection: '请先在文件中选中文本',
        failed: '无法写入对话框，请重试',
        label: '【{file}，第 {start}-{end} 行】',
        fileLabel: '【{file}】',
        selection: '第 {start}-{end} 行',
        menuTitle: '引用选中内容',
      },
    }

    const en = {
      meta: {
        title: 'Workspace Files',
        description: 'Browse every file in the current workspace, drag one into the composer, and quote selected lines through the DSH editor.',
      },
      files: {
        tabTitle: 'Workspace Files',
        currentWorkspace: 'Current workspace',
        noCurrentWorkspace: 'This session has no matching workspace folder.',
        guideTitle: 'Workspace Files',
        guideDescription: 'Browse every file in the current workspace, drag one into the composer, or open it in the DSH editor.',
        refresh: 'Refresh',
        hint: 'Drag a file into the composer to reference it · click a file to open it in the DSH editor · select text there and right-click to quote lines',
        loading: 'Loading…',
        emptyDir: 'Empty folder',
        noSession: 'This workspace has no session yet, so the DSH editor cannot open its files. Start a session here first.',
        noEditor: 'The DSH editor is unavailable right now.',
        openFailed: 'Could not open the file: {message}',
        listFailed: 'Could not read the folder: {message}',
        readFailed: 'Could not read the file: {message}',
        retry: 'Retry',
        sessions: '{count} sessions',
        dragTitle: 'Drag to the composer to reference {path}',
        openTitle: 'Open {path} in the DSH editor',
        pathLabel: 'Path',
        truncated: 'This folder has too many entries; only the first {count} are shown.',
        current: 'Current',
      },
      quote: {
        action: 'Quote selection',
        title: 'Quote the selected file content into the composer',
        quote: 'Quote in composer',
        copy: 'Copy selection',
        copied: 'Copied',
        done: 'Quoted in composer',
        noSelection: 'Select some text in the file first',
        failed: 'Could not write to the composer; try again',
        label: '[{file}, lines {start}-{end}]',
        fileLabel: '[{file}]',
        selection: 'Lines {start}-{end}',
        menuTitle: 'Quote selection',
      },
    }

    const CSS = `
.rd-root, .rd-root * { box-sizing: border-box; }
.rd-root { display:flex; flex-direction:column; height:100%; min-height:0; color:var(--dsw-alias-label-primary); background:var(--dsw-alias-bg-base); font-family:inherit; font-size:13px; line-height:1.45; }
.rd-toolbar { display:flex; align-items:center; justify-content:space-between; gap:8px; flex:none; padding:10px 10px 8px; border-bottom:1px solid var(--dsw-alias-border-l1); }
.rd-toolbar-title { display:flex; align-items:center; gap:7px; min-width:0; font-size:13px; font-weight:600; }
.rd-toolbar-sub { margin-left:4px; color:var(--dsw-alias-label-secondary); font-size:11px; font-weight:400; white-space:nowrap; }
.rd-hint { flex:none; padding:7px 12px; color:var(--dsw-alias-label-secondary); font-size:11px; line-height:1.5; border-bottom:1px solid var(--dsw-alias-border-l1); }
.rd-scroll { flex:1; min-height:0; overflow:auto; padding:6px 6px 18px; }
.rd-notice { margin:7px 6px 2px; padding:7px 9px; border:1px solid var(--dsw-alias-state-error-primary); border-radius:7px; color:var(--dsw-alias-state-error-primary); font-size:12px; line-height:1.5; }
.rd-workspace { margin:5px 2px 7px; border:1px solid var(--dsw-alias-border-l1); border-radius:10px; overflow:hidden; background:var(--dsw-alias-bg-layer-1); }
.rd-workspace-head { display:flex; align-items:flex-start; gap:7px; width:100%; padding:8px 8px; border:0; background:transparent; color:inherit; text-align:left; cursor:pointer; font:inherit; }
.rd-workspace-head:hover { background:var(--dsw-alias-bg-layer-2); }
.rd-workspace-head--static { cursor:default; }
.rd-workspace-head--static:hover { background:transparent; }
.rd-workspace-text { display:flex; flex-direction:column; gap:1px; min-width:0; flex:1; }
.rd-workspace-title { display:flex; align-items:center; gap:6px; min-width:0; font-size:12.5px; font-weight:600; }
.rd-workspace-title > span:first-child { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.rd-badge { flex:none; padding:0 5px; border-radius:999px; border:1px solid var(--dsw-alias-border-l1); color:var(--dsw-alias-label-secondary); font-size:10px; line-height:16px; font-weight:400; }
.rd-badge--current { border-color:var(--dsw-alias-brand-primary); background:transparent; color:var(--dsw-alias-brand-primary); }
.rd-path { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--dsw-alias-label-secondary); font-size:10.5px; }
.rd-workspace-body { padding:2px 6px 7px; border-top:1px solid var(--dsw-alias-border-l1); }
.rd-row { display:flex; align-items:center; gap:5px; width:100%; min-height:25px; padding:2px 6px; border:0; border-radius:5px; background:transparent; color:inherit; font:inherit; text-align:left; }
.rd-row:hover { background:var(--dsw-alias-bg-layer-2); }
.rd-row:focus-visible { outline:1px solid var(--dsw-alias-brand-primary); outline-offset:-1px; }
.rd-row--dir { cursor:pointer; }
.rd-row--file { cursor:pointer; }
.rd-row--file:active { background:var(--dsw-alias-bg-layer-2); }
.rd-name { min-width:0; flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:12px; }
.rd-row--dir .rd-name { font-weight:500; }
.rd-size { flex:none; color:var(--dsw-alias-label-secondary); font-size:10px; }
.rd-chevron { flex:none; width:14px; height:14px; display:inline-flex; align-items:center; justify-content:center; color:var(--dsw-alias-label-secondary); transition:transform .12s ease; }
.rd-chevron--open { transform:rotate(90deg); }
.rd-spacer { flex:none; width:14px; height:14px; }
.rd-icon { flex:none; display:inline-flex; width:16px; height:16px; align-items:center; justify-content:center; color:var(--dsw-alias-label-secondary); }
.rd-icon--folder { color:var(--dsw-alias-state-warn-primary); }
.rd-icon--file { width:18px; height:18px; }
.rd-title-icon { display:inline-flex; align-items:center; margin-right:5px; vertical-align:middle; color:var(--dsw-alias-state-warn-primary); }
.rd-muted { padding:5px 8px 5px 26px; color:var(--dsw-alias-label-secondary); font-size:11px; }
.rd-empty { padding:18px 14px; color:var(--dsw-alias-label-secondary); font-size:12px; text-align:center; }
.rd-error { padding:5px 8px 5px 26px; color:var(--dsw-alias-state-error-primary); font-size:11px; line-height:1.5; }
.rd-error button { margin-left:5px; }
.rd-icon-btn { appearance:none; display:inline-flex; align-items:center; justify-content:center; width:26px; height:26px; padding:0; border:1px solid transparent; border-radius:6px; background:transparent; color:var(--dsw-alias-label-secondary); cursor:pointer; }
.rd-icon-btn:hover { background:var(--dsw-alias-bg-layer-2); color:var(--dsw-alias-label-primary); }
.rd-icon-btn:focus-visible { outline:2px solid var(--dsw-alias-brand-primary); outline-offset:1px; }
.rd-icon-btn:disabled { opacity:.45; cursor:default; }
.rd-composer-btn { width:26px; height:26px; }
.rd-quote-wrap { display:inline-flex; align-items:center; gap:4px; }
.rd-quote-hint { max-width:190px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--dsw-alias-label-secondary); font-size:11px; }
.rd-quote-menu { position:fixed; z-index:10050; width:230px; padding:6px; border:1px solid var(--dsw-alias-border-l2); border-radius:9px; background:var(--dsw-alias-bg-overlay); color:var(--dsw-alias-label-primary); }
.rd-quote-menu-title { padding:5px 7px 6px; color:var(--dsw-alias-label-secondary); font-size:11px; line-height:1.45; }
.rd-quote-menu-label { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--dsw-alias-label-primary); font-size:12px; font-weight:600; }
.rd-quote-menu button { display:block; width:100%; padding:6px 7px; border:0; border-radius:5px; background:transparent; color:inherit; font:inherit; font-size:12px; text-align:left; cursor:pointer; }
.rd-quote-menu button:hover { background:var(--dsw-alias-bg-layer-2); }
.rd-quote-menu button:focus-visible { outline:1px solid var(--dsw-alias-brand-primary); outline-offset:-1px; }
.rd-quote-menu-sep { height:1px; margin:4px 6px; background:var(--dsw-alias-border-l1); }
.rd-inline-link { appearance:none; border:0; background:transparent; color:var(--dsw-alias-brand-primary); padding:0; font:inherit; cursor:pointer; text-decoration:underline; }
`

    function flattenDictionary(dictionary, prefix) {
      const result = {}
      for (const [key, value] of Object.entries(dictionary)) {
        const name = prefix ? `${prefix}.${key}` : key
        if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
          Object.assign(result, flattenDictionary(value, name))
        } else {
          result[name] = String(value)
        }
      }
      return result
    }

    function normalizeSlashes(value) {
      return String(value ?? '').replace(/\\/g, '/')
    }

    function baseName(value) {
      const normalized = normalizeSlashes(value).replace(/\/+$/, '')
      const index = normalized.lastIndexOf('/')
      return index === -1 ? normalized : normalized.slice(index + 1)
    }

    function samePath(left, right) {
      return normalizeSlashes(left).replace(/\/+$/, '').toLowerCase()
        === normalizeSlashes(right).replace(/\/+$/, '').toLowerCase()
    }

    function isInside(root, target) {
      const normalizedRoot = normalizeSlashes(root).replace(/\/+$/, '')
      const normalizedTarget = normalizeSlashes(target)
      return normalizedTarget === normalizedRoot
        || normalizedTarget.toLowerCase().startsWith(`${normalizedRoot.toLowerCase()}/`)
    }

    function relativeInside(root, target) {
      const normalizedRoot = normalizeSlashes(root).replace(/\/+$/, '')
      const normalizedTarget = normalizeSlashes(target)
      if (samePath(normalizedRoot, normalizedTarget)) return ''
      if (isInside(normalizedRoot, normalizedTarget)) {
        return normalizedTarget.slice(normalizedRoot.length + 1)
      }
      return normalizedTarget
    }

    function formatMention(filePath) {
      const normalized = normalizeSlashes(filePath).replace(/^\.\/+/, '')
      const safe = normalized.replace(/"/g, "'")
      if (/\s/.test(safe) || safe.includes('"')) return `@"${safe}"`
      return `@${safe}`
    }

    function formatSize(value) {
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return ''
      if (value < 1024) return `${value} B`
      if (value < 1024 * 1024) return `${(value / 1024).toFixed(value < 10 * 1024 ? 1 : 0)} KB`
      if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`
      return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`
    }

    function sessionFileAddress(sessionId, filePath) {
      const normalized = normalizeSlashes(filePath).replace(/^(?:\.\/)+/, '')
      const encode = (segment) => encodeURIComponent(segment).replace(/%3A/gi, ':')
      return `dsh-resource://file/session/${encode(sessionId)}/${normalized.split('/').map(encode).join('/')}`
    }

    function addressFor(sessionId, cwd, absolutePath) {
      const normalized = normalizeSlashes(absolutePath)
      if (cwd !== undefined && cwd !== null && cwd !== '' && isInside(cwd, normalized)) {
        return sessionFileAddress(sessionId, relativeInside(cwd, normalized))
      }
      return sessionFileAddress(sessionId, normalized)
    }

    function quoteRefFor(absolutePath, start, end, mention) {
      const payload = JSON.stringify({
        path: normalizeSlashes(absolutePath),
        start,
        end,
        mention,
      })
      return `${QUOTE_PREFIX}${encodeURIComponent(payload)}`
    }

    function parseQuoteRef(ref) {
      if (typeof ref !== 'string' || !ref.startsWith(QUOTE_PREFIX)) return null
      const rest = ref.slice(QUOTE_PREFIX.length)
      try {
        const decoded = decodeURIComponent(rest)
        if (decoded.startsWith('{')) {
          const payload = JSON.parse(decoded)
          const start = Number(payload?.start)
          const end = Number(payload?.end)
          if (typeof payload?.path !== 'string' || !Number.isFinite(start) || !Number.isFinite(end)) return null
          return {
            path: payload.path,
            start: Math.max(1, Math.trunc(start)),
            end: Math.max(1, Math.trunc(end)),
            mention: typeof payload.mention === 'string' ? payload.mention : undefined,
          }
        }
      } catch {
        /* fall through to the legacy delimiter form */
      }
      const first = rest.indexOf(':')
      const second = rest.indexOf(':', first + 1)
      if (first < 0 || second < 0) return null
      try {
        const filePath = decodeURIComponent(rest.slice(0, first))
        const start = Number(rest.slice(first + 1, second))
        const end = Number(rest.slice(second + 1))
        if (!Number.isFinite(start) || !Number.isFinite(end)) return null
        return {
          path: filePath,
          start: Math.max(1, Math.trunc(start)),
          end: Math.max(1, Math.trunc(end)),
          mention: undefined,
        }
      } catch {
        return null
      }
    }

    function quoteModelText(parsed) {
      if (!parsed) return ''
      const mention = parsed.mention || formatMention(parsed.path)
      return `${mention} L${parsed.start}-L${parsed.end}`
    }

    function appendReference(input, inputActions, reference) {
      if (!inputActions || typeof inputActions.setDraft !== 'function') return false
      if (!input || input.phase === 'submitting' || input.phase === 'adjudicating') return false
      const draft = typeof input.draft === 'string' ? input.draft : ''
      const separator = draft === '' ? '' : (/\s$/.test(draft) ? '' : '\n')
      const trailing = typeof reference.trailing === 'string' ? reference.trailing : ''
      const text = `${draft}${separator}${reference.clipboardText}${trailing}`
      const references = []
      const existing = Array.isArray(input.occurrences) ? input.occurrences : []
      for (const occurrence of existing) {
        if (!occurrence || typeof occurrence.source !== 'string' || typeof occurrence.ref !== 'string') continue
        if (typeof occurrence.offset !== 'number' || typeof occurrence.length !== 'number') continue
        if (typeof occurrence.label !== 'string' || typeof occurrence.clipboardText !== 'string') continue
        references.push({
          source: occurrence.source,
          ref: occurrence.ref,
          offset: occurrence.offset,
          length: occurrence.length,
          label: occurrence.label,
          clipboardText: occurrence.clipboardText,
          ...(occurrence.appearance === undefined ? {} : { appearance: occurrence.appearance }),
          ...(occurrence.invalid === undefined ? {} : { invalid: occurrence.invalid }),
        })
      }
      references.push({
        source: reference.source,
        ref: reference.ref,
        offset: draft.length + separator.length,
        length: reference.clipboardText.length,
        label: reference.label,
        clipboardText: reference.clipboardText,
        appearance: reference.appearance,
      })
      try {
        inputActions.setDraft({
          text,
          references,
          ...(typeof input.claim?.token === 'string' ? { command: { token: input.claim.token } } : {}),
        })
        return true
      } catch {
        return false
      }
    }

    function elementOf(node) {
      if (!node) return null
      return node.nodeType === 1 ? node : node.parentElement
    }

    function codeLineOf(element) {
      if (!element) return null
      const row = element.closest('.line')
      if (!row) return null
      const pre = row.closest('pre')
      if (!pre) return null
      const rows = Array.prototype.slice.call(pre.querySelectorAll('.line'))
      const index = rows.indexOf(row)
      return index === -1 ? null : index + 1
    }

    function plainLineOf(element) {
      if (!element) return null
      const row = element.closest('[data-textpreview-line]')
      if (!row) return null
      const value = Number(row.getAttribute('data-textpreview-line'))
      return Number.isFinite(value) ? value : null
    }

    function lineCountBefore(text, offset) {
      let line = 1
      const limit = Math.max(0, Math.min(offset, text.length))
      for (let index = 0; index < limit; index += 1) {
        if (text.charCodeAt(index) === 10) line += 1
      }
      return line
    }

    function computeQuote(host, allowFallback) {
      if (!host || !host.absolutePath) return null
      const selection = window.getSelection()
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null
      const selectedText = selection.toString()
      if (selectedText.trim() === '') return null

      const range = selection.getRangeAt(0)
      const startElement = elementOf(range.startContainer)
      const endElement = elementOf(range.endContainer)
      if (!startElement || !endElement) return null

      const codeRoot = startElement.closest('[data-code-preview]')
      const plainRoot = startElement.closest('[data-textpreview-line]')
      const markdownRoot = startElement.closest('[data-document-markdown]')
      let startLine = null
      let endLine = null

      if (codeRoot && endElement.closest('[data-code-preview]') === codeRoot) {
        startLine = codeLineOf(startElement)
        endLine = codeLineOf(endElement)
      } else if (plainRoot && endElement.closest('[data-textpreview-line]') !== null) {
        startLine = plainLineOf(startElement)
        endLine = plainLineOf(endElement)
      } else if ((allowFallback || markdownRoot !== null) && host.fileText) {
        const source = host.fileText
        let index = source.indexOf(selectedText)
        if (index === -1) {
          const trimmed = selectedText.replace(/\s+$/g, '')
          if (trimmed !== '' && trimmed !== selectedText) index = source.indexOf(trimmed)
        }
        if (index >= 0) {
          const count = selectedText.split('\n').length
          startLine = lineCountBefore(source, index)
          endLine = startLine + Math.max(0, count - 1)
        }
      }

      if (!startLine || !endLine) return null
      if (range.endOffset === 0 && endLine > startLine) endLine -= 1
      if (endLine < startLine) endLine = startLine

      return {
        path: host.absolutePath,
        start: startLine,
        end: endLine,
        text: selectedText,
      }
    }

    async function requestJson(path, params) {
      const query = new URLSearchParams(params ?? {})
      const response = await fetch(`${API}${path}?${query.toString()}`, {
        cache: 'no-store',
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      })
      let body
      try {
        body = await response.json()
      } catch {
        body = null
      }
      if (!response.ok || !body || body.ok !== true) {
        const message = body?.error?.message ?? `HTTP ${response.status}`
        const error = new Error(message)
        error.code = body?.error?.code
        throw error
      }
      return body
    }

    function listDirectory(path) {
      return requestJson('/list', { path })
    }

    function readFile(path) {
      return requestJson('/read', { path })
    }

    const textCache = new Map()

    function cacheText(path, text) {
      if (textCache.size >= 24) {
        const first = textCache.keys().next().value
        if (first !== undefined) textCache.delete(first)
      }
      textCache.set(path, text)
    }

    function getCachedText(path) {
      return textCache.get(path)
    }

    function makeIcon(children, viewBox) {
      return function Icon(props) {
        const size = props?.size ?? 16
        return h('svg', {
          width: size,
          height: size,
          viewBox: viewBox ?? '0 0 24 24',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.7,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': true,
          style: { display: 'block' },
        }, children)
      }
    }

    const FolderIcon = makeIcon([
      h('path', { key: 'a', d: 'M3.5 6.5h6l2 2h9v10.5a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19V6.5Z' }),
    ])

    /**
     * 文件图标模板 / file-icon template
     *
     * 1. 在 FILE_ICON_STYLES 里定义外观；
     * 2. 在 FILE_ICON_BY_EXTENSION 里把后缀映射到这个键；
     * 3. 文件名精确匹配用 FILE_ICON_BY_NAME；
     * 4. README / Dockerfile / *.config.ts 这类规则用 FILE_ICON_PATTERNS；
     * 5. 需要图形而不是文字时，在 FILE_ICON_GLYPHS 里加一个返回 SVG 子节点的函数。
     *
     * 例：
     *   FILE_ICON_BY_EXTENSION.foo = 'foo'
     *   FILE_ICON_STYLES.foo = { label: 'FOO', bg: '#334155', fg: '#ffffff' }
     */
    const FILE_ICON_STYLES = {
      js: { label: 'JS', bg: '#F7DF1E', fg: '#1B1B1F' },
      react: { label: 'JSX', bg: '#0891B2', fg: '#FFFFFF' },
      ts: { label: 'TS', bg: '#3178C6', fg: '#FFFFFF' },
      tsx: { label: 'TSX', bg: '#2563EB', fg: '#FFFFFF' },
      json: { label: '{}', bg: '#B45309', fg: '#FFFFFF', mono: true, fontSize: 8 },
      html: { label: '<>', bg: '#E34F26', fg: '#FFFFFF', mono: true, fontSize: 8 },
      css: { label: '#', bg: '#1572B6', fg: '#FFFFFF', mono: true, fontSize: 10 },
      sass: { label: 'S', bg: '#CC6699', fg: '#FFFFFF' },
      less: { label: 'L', bg: '#1D365D', fg: '#FFFFFF' },
      markdown: { label: 'MD', bg: '#0EA5E9', fg: '#FFFFFF' },
      python: { label: 'PY', bg: '#3776AB', fg: '#FFD43B' },
      rust: { label: 'RS', bg: '#B7410E', fg: '#FFFFFF' },
      go: { label: 'GO', bg: '#00ADD8', fg: '#002B36' },
      java: { label: 'JV', bg: '#B07219', fg: '#FFFFFF' },
      kotlin: { label: 'KT', bg: '#7F52FF', fg: '#FFFFFF' },
      c: { label: 'C', bg: '#5C6BC0', fg: '#FFFFFF' },
      cpp: { label: 'C++', bg: '#00599C', fg: '#FFFFFF', fontSize: 5.2 },
      csharp: { label: 'C#', bg: '#68217A', fg: '#FFFFFF' },
      php: { label: 'PHP', bg: '#777BB4', fg: '#FFFFFF' },
      ruby: { label: 'RB', bg: '#CC342D', fg: '#FFFFFF' },
      swift: { label: 'SW', bg: '#F05138', fg: '#FFFFFF' },
      shell: { label: '>_', bg: '#1F2937', fg: '#7EE787', mono: true, fontSize: 7 },
      powershell: { label: 'PS', bg: '#012456', fg: '#FFFFFF' },
      sql: { label: 'SQL', bg: '#336791', fg: '#FFFFFF' },
      yaml: { label: 'YML', bg: '#CB171E', fg: '#FFFFFF' },
      xml: { label: 'XML', bg: '#F1662A', fg: '#FFFFFF' },
      toml: { label: 'TML', bg: '#9C4221', fg: '#FFFFFF' },
      vue: { label: 'V', bg: '#41B883', fg: '#FFFFFF' },
      svelte: { label: 'S', bg: '#FF3E00', fg: '#FFFFFF' },
      image: { glyph: 'image', bg: '#2E9E6B', fg: '#FFFFFF' },
      audio: { glyph: 'audio', bg: '#8B5CF6', fg: '#FFFFFF' },
      video: { glyph: 'video', bg: '#DC2626', fg: '#FFFFFF' },
      pdf: { label: 'PDF', bg: '#DC2626', fg: '#FFFFFF' },
      word: { label: 'W', bg: '#2563EB', fg: '#FFFFFF' },
      excel: { label: 'X', bg: '#15803D', fg: '#FFFFFF' },
      powerpoint: { label: 'P', bg: '#D24726', fg: '#FFFFFF' },
      archive: { glyph: 'archive', bg: '#A16207', fg: '#FFFFFF' },
      font: { label: 'A', bg: '#7C3AED', fg: '#FFFFFF' },
      binary: { label: '01', bg: '#4B5563', fg: '#FFFFFF', mono: true },
      database: { glyph: 'database', bg: '#0369A1', fg: '#FFFFFF' },
      git: { glyph: 'git', bg: '#F1502F', fg: '#FFFFFF' },
      docker: { glyph: 'docker', bg: '#2496ED', fg: '#FFFFFF' },
      config: { glyph: 'config', bg: '#6B7280', fg: '#FFFFFF' },
      env: { label: 'ENV', bg: '#8B5CF6', fg: '#FFFFFF' },
      lock: { glyph: 'lock', bg: '#4B5563', fg: '#FFFFFF' },
      readme: { label: 'i', bg: '#0EA5E9', fg: '#FFFFFF', mono: true, fontSize: 12 },
      license: { label: '§', bg: '#7C3AED', fg: '#FFFFFF', fontSize: 11 },
      text: { glyph: 'text', bg: '#64748B', fg: '#FFFFFF' },
      file: { glyph: 'text', bg: '#475569', fg: '#FFFFFF' },
      npm: { label: 'NPM', bg: '#CB3837', fg: '#FFFFFF' },
      pnpm: { label: 'PNM', bg: '#F69220', fg: '#FFFFFF' },
      yarn: { label: 'YRN', bg: '#2C8EBB', fg: '#FFFFFF' },
      bun: { label: 'BUN', bg: '#FBF0DF', fg: '#1B1B1F' },
      dart: { label: 'DART', bg: '#0175C2', fg: '#FFFFFF', fontSize: 4.8 },
      make: { label: 'MK', bg: '#64748B', fg: '#FFFFFF' },
      lua: { label: 'LUA', bg: '#2C2D72', fg: '#FFFFFF' },
      r: { label: 'R', bg: '#276DC3', fg: '#FFFFFF' },
      scala: { label: 'SC', bg: '#DC322F', fg: '#FFFFFF' },
      elixir: { label: 'EX', bg: '#4B275F', fg: '#FFFFFF' },
      haskell: { label: 'HS', bg: '#5E5086', fg: '#FFFFFF' },
      clojure: { label: 'CLJ', bg: '#5881D8', fg: '#FFFFFF' },
      julia: { label: 'JL', bg: '#9558B2', fg: '#FFFFFF' },
      perl: { label: 'PL', bg: '#39457E', fg: '#FFFFFF' },
      solidity: { label: 'SOL', bg: '#363636', fg: '#FFFFFF' },
      zig: { label: 'ZIG', bg: '#F7A41D', fg: '#1B1B1F' },
    }

    const FILE_ICON_GLYPHS = {
      image(fg) {
        return [
          h('path', {
            key: 'mountains',
            d: 'M4 17.5l4.5-4.5 3 3 3.2-3.2L20 17.5',
            fill: 'none',
            stroke: fg,
            strokeWidth: 1.8,
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
          }),
          h('circle', { key: 'sun', cx: 8.2, cy: 8.2, r: 1.6, fill: fg }),
        ]
      },
      audio(fg) {
        return [
          h('path', {
            key: 'stem',
            d: 'M10 17V7l7-2v10',
            fill: 'none',
            stroke: fg,
            strokeWidth: 1.7,
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
          }),
          h('circle', { key: 'a', cx: 8, cy: 17, r: 2, fill: fg }),
          h('circle', { key: 'b', cx: 15, cy: 15, r: 2, fill: fg }),
        ]
      },
      video(fg) {
        return [h('path', { key: 'play', d: 'M9 7.5 17 12l-8 4.5V7.5Z', fill: fg })]
      },
      archive(fg) {
        return [
          h('rect', {
            key: 'box',
            x: 5,
            y: 4,
            width: 14,
            height: 16,
            rx: 2,
            fill: 'none',
            stroke: fg,
            strokeWidth: 1.7,
          }),
          h('path', {
            key: 'zip',
            d: 'M12 4v16',
            stroke: fg,
            strokeWidth: 1.7,
            strokeDasharray: '2 2',
          }),
        ]
      },
      database(fg) {
        return [
          h('ellipse', { key: 'top', cx: 12, cy: 6, rx: 6, ry: 2.5, fill: 'none', stroke: fg, strokeWidth: 1.6 }),
          h('path', {
            key: 'body',
            d: 'M6 6v12c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5V6',
            fill: 'none',
            stroke: fg,
            strokeWidth: 1.6,
          }),
          h('path', {
            key: 'line',
            d: 'M6 12c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5',
            fill: 'none',
            stroke: fg,
            strokeWidth: 1.6,
          }),
        ]
      },
      git(fg) {
        return [
          h('circle', { key: 'a', cx: 7, cy: 6, r: 2, fill: 'none', stroke: fg, strokeWidth: 1.7 }),
          h('circle', { key: 'b', cx: 7, cy: 18, r: 2, fill: 'none', stroke: fg, strokeWidth: 1.7 }),
          h('circle', { key: 'c', cx: 17, cy: 9, r: 2, fill: 'none', stroke: fg, strokeWidth: 1.7 }),
          h('path', {
            key: 'branch',
            d: 'M7 8v8M9 12h3a5 5 0 0 0 5-3',
            fill: 'none',
            stroke: fg,
            strokeWidth: 1.7,
            strokeLinecap: 'round',
          }),
        ]
      },
      docker(fg) {
        return [
          h('rect', { key: 'a', x: 4, y: 11, width: 5, height: 4, rx: 0.8, fill: 'none', stroke: fg, strokeWidth: 1.4 }),
          h('rect', { key: 'b', x: 10, y: 11, width: 5, height: 4, rx: 0.8, fill: 'none', stroke: fg, strokeWidth: 1.4 }),
          h('rect', { key: 'c', x: 16, y: 11, width: 4, height: 4, rx: 0.8, fill: 'none', stroke: fg, strokeWidth: 1.4 }),
          h('rect', { key: 'd', x: 10, y: 6.5, width: 5, height: 4, rx: 0.8, fill: 'none', stroke: fg, strokeWidth: 1.4 }),
          h('path', {
            key: 'base',
            d: 'M4 16h16c-1 2-4 3-8 3s-7-1-8-3Z',
            fill: 'none',
            stroke: fg,
            strokeWidth: 1.4,
            strokeLinejoin: 'round',
          }),
        ]
      },
      config(fg) {
        return [
          h('path', { key: 'l1', d: 'M4 7h16', stroke: fg, strokeWidth: 1.5, strokeLinecap: 'round' }),
          h('path', { key: 'l2', d: 'M4 12h16', stroke: fg, strokeWidth: 1.5, strokeLinecap: 'round' }),
          h('path', { key: 'l3', d: 'M4 17h16', stroke: fg, strokeWidth: 1.5, strokeLinecap: 'round' }),
          h('circle', { key: 'k1', cx: 9, cy: 7, r: 2, fill: fg }),
          h('circle', { key: 'k2', cx: 15, cy: 12, r: 2, fill: fg }),
          h('circle', { key: 'k3', cx: 8, cy: 17, r: 2, fill: fg }),
        ]
      },
      text(fg) {
        return [
          h('path', { key: 'l1', d: 'M6 7h12', stroke: fg, strokeWidth: 1.6, strokeLinecap: 'round' }),
          h('path', { key: 'l2', d: 'M6 12h12', stroke: fg, strokeWidth: 1.6, strokeLinecap: 'round' }),
          h('path', { key: 'l3', d: 'M6 17h8', stroke: fg, strokeWidth: 1.6, strokeLinecap: 'round' }),
        ]
      },
      lock(fg) {
        return [
          h('rect', { key: 'body', x: 6, y: 10, width: 12, height: 10, rx: 2, fill: 'none', stroke: fg, strokeWidth: 1.6 }),
          h('path', {
            key: 'shackle',
            d: 'M8.5 10V8a3.5 3.5 0 0 1 7 0v2',
            fill: 'none',
            stroke: fg,
            strokeWidth: 1.6,
            strokeLinecap: 'round',
          }),
        ]
      },
    }

    const FILE_ICON_BY_EXTENSION = {
      js: 'js', mjs: 'js', cjs: 'js', jsx: 'react',
      ts: 'ts', mts: 'ts', cts: 'ts', tsx: 'tsx',
      json: 'json', jsonc: 'json', json5: 'json',
      html: 'html', htm: 'html', xhtml: 'html',
      css: 'css', scss: 'sass', sass: 'sass', less: 'less',
      md: 'markdown', markdown: 'markdown', mdx: 'markdown',
      py: 'python', pyw: 'python', pyi: 'python',
      rs: 'rust', go: 'go', java: 'java',
      kt: 'kotlin', kts: 'kotlin',
      c: 'c', h: 'c', cc: 'cpp', cpp: 'cpp', cxx: 'cpp', hpp: 'cpp', hh: 'cpp', hxx: 'cpp',
      cs: 'csharp', php: 'php',
      rb: 'ruby', rake: 'ruby', gemspec: 'ruby',
      swift: 'swift', m: 'c', mm: 'cpp',
      lua: 'lua', r: 'r', rmd: 'r', scala: 'scala', sc: 'scala',
      ex: 'elixir', exs: 'elixir', hs: 'haskell', lhs: 'haskell',
      clj: 'clojure', cljs: 'clojure', cljc: 'clojure', edn: 'clojure',
      jl: 'julia', pl: 'perl', pm: 'perl', sol: 'solidity', zig: 'zig', dart: 'dart',
      sh: 'shell', bash: 'shell', zsh: 'shell', fish: 'shell', ksh: 'shell',
      ps1: 'powershell', psm1: 'powershell', bat: 'shell', cmd: 'shell',
      sql: 'sql', sqlite: 'database', db: 'database',
      yml: 'yaml', yaml: 'yaml', xml: 'xml', svg: 'image',
      toml: 'toml', ini: 'config', conf: 'config', cfg: 'config', properties: 'config',
      vue: 'vue', svelte: 'svelte', astro: 'config',
      png: 'image', jpg: 'image', jpeg: 'image', gif: 'image', webp: 'image', bmp: 'image',
      ico: 'image', tif: 'image', tiff: 'image', avif: 'image', heic: 'image',
      mp3: 'audio', wav: 'audio', flac: 'audio', ogg: 'audio', m4a: 'audio', aac: 'audio', opus: 'audio',
      mp4: 'video', mov: 'video', webm: 'video', mkv: 'video', avi: 'video', m4v: 'video',
      pdf: 'pdf',
      doc: 'word', docx: 'word', rtf: 'word', odt: 'word',
      xls: 'excel', xlsx: 'excel', csv: 'excel', tsv: 'excel', ods: 'excel',
      ppt: 'powerpoint', pptx: 'powerpoint', odp: 'powerpoint',
      zip: 'archive', rar: 'archive', '7z': 'archive', tar: 'archive', gz: 'archive',
      tgz: 'archive', bz2: 'archive', xz: 'archive', zst: 'archive', jar: 'archive', apk: 'archive',
      woff: 'font', woff2: 'font', ttf: 'font', otf: 'font', eot: 'font',
      exe: 'binary', dll: 'binary', so: 'binary', dylib: 'binary', wasm: 'binary',
      class: 'binary', bin: 'binary', o: 'binary', a: 'binary', obj: 'binary',
      lock: 'lock', log: 'text', txt: 'text', text: 'text',
      env: 'env', pem: 'lock', key: 'lock', crt: 'lock', cer: 'lock',
      gradle: 'java', pom: 'xml', cmake: 'config', mk: 'make',
    }

    const FILE_ICON_BY_NAME = {
      'package.json': 'npm',
      'package-lock.json': 'npm',
      'pnpm-lock.yaml': 'pnpm',
      'yarn.lock': 'yarn',
      'bun.lockb': 'bun',
      'tsconfig.json': 'ts',
      'jsconfig.json': 'js',
      'dockerfile': 'docker',
      'docker-compose.yml': 'docker',
      'docker-compose.yaml': 'docker',
      'compose.yml': 'docker',
      'compose.yaml': 'docker',
      '.gitignore': 'git',
      '.gitattributes': 'git',
      '.gitmodules': 'git',
      '.env': 'env',
      '.env.local': 'env',
      '.env.development': 'env',
      '.env.production': 'env',
      '.npmrc': 'config',
      '.prettierrc': 'config',
      '.eslintrc': 'config',
      '.editorconfig': 'config',
      'makefile': 'make',
      'cmakelists.txt': 'config',
      'cargo.toml': 'rust',
      'go.mod': 'go',
      'go.sum': 'go',
      'gemfile': 'ruby',
      'rakefile': 'ruby',
      'composer.json': 'php',
      'pubspec.yaml': 'dart',
      'podfile': 'swift',
      'procfile': 'config',
      'justfile': 'make',
      'pom.xml': 'java',
      'build.gradle': 'java',
      'settings.gradle': 'java',
      'requirements.txt': 'python',
      'pyproject.toml': 'python',
      'pipfile': 'python',
      'gemfile.lock': 'ruby',
      'composer.lock': 'php',
    }

    const FILE_ICON_PATTERNS = [
      [/^readme(?:\..*)?$/i, 'readme'],
      [/^license(?:\..*)?$/i, 'license'],
      [/^copying(?:\..*)?$/i, 'license'],
      [/^dockerfile(?:\..*)?$/i, 'docker'],
      [/^makefile(?:\..*)?$/i, 'make'],
      [/^cmakelists\.txt$/i, 'config'],
      [/\.d\.ts$/i, 'ts'],
      [/\.config\.(?:js|cjs|mjs|ts|mts|cts)$/i, 'config'],
      [/^\.[^./\\]+rc(?:\..*)?$/i, 'config'],
      [/\.env(?:\..*)?$/i, 'env'],
    ]

    function fileIconKey(name) {
      const lower = String(name ?? '').toLowerCase()
      if (FILE_ICON_BY_NAME[lower] !== undefined) return FILE_ICON_BY_NAME[lower]
      for (const [pattern, key] of FILE_ICON_PATTERNS) {
        if (pattern.test(lower)) return key
      }
      if (lower.startsWith('.') && lower.indexOf('.', 1) === -1) return 'config'
      const dot = lower.lastIndexOf('.')
      const extension = dot === -1 ? '' : lower.slice(dot + 1)
      return FILE_ICON_BY_EXTENSION[extension] ?? 'file'
    }

    function FileTypeIcon({ name, size }) {
      const iconSize = size ?? 17
      const key = fileIconKey(name)
      const style = FILE_ICON_STYLES[key] ?? FILE_ICON_STYLES.file
      const label = style.label ?? ''
      const fontSize = style.fontSize ?? (label.length >= 4 ? 4.8 : label.length === 3 ? 5.3 : 7)
      const glyph = style.glyph ? FILE_ICON_GLYPHS[style.glyph] : undefined
      return h('svg', {
        width: iconSize,
        height: iconSize,
        viewBox: '0 0 24 24',
        'aria-hidden': true,
        style: { display: 'block', flex: 'none' },
      },
      h('rect', { key: 'badge', x: 2, y: 2, width: 20, height: 20, rx: 5.5, fill: style.bg }),
      glyph
        ? h('g', { key: 'glyph' }, glyph(style.fg))
        : h('text', {
          key: 'label',
          x: 12,
          y: 12.7,
          textAnchor: 'middle',
          dominantBaseline: 'middle',
          fill: style.fg,
          fontFamily: style.mono
            ? 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
            : 'ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif',
          fontSize,
          fontWeight: 700,
          letterSpacing: label.length >= 3 ? '-0.2' : '0',
        }, label))
    }

    const ChevronIcon = makeIcon([
      h('path', { key: 'a', d: 'm9 6 6 6-6 6' }),
    ])

    const RefreshIcon = makeIcon([
      h('path', { key: 'a', d: 'M20 11a8 8 0 1 0-2.3 5.7' }),
      h('path', { key: 'b', d: 'M20 5v6h-6' }),
    ])

    const QuoteIcon = makeIcon([
      h('path', { key: 'a', d: 'M6 8H4.5A2.5 2.5 0 0 0 2 10.5v3A2.5 2.5 0 0 0 4.5 16H6v-3H4.5' }),
      h('path', { key: 'b', d: 'M16 8h-1.5A2.5 2.5 0 0 0 12 10.5v3a2.5 2.5 0 0 0 2.5 2.5H16v-3h-1.5' }),
      h('path', { key: 'c', d: 'M9 7h6' }),
    ])

    function GuideArtwork(props) {
      const size = props?.size ?? 40
      return h('svg', {
        width: size,
        height: size,
        viewBox: '0 0 48 48',
        fill: 'none',
        'aria-hidden': true,
      },
      h('rect', { key: 'bg', x: 3, y: 3, width: 42, height: 42, rx: 10, fill: 'var(--dsw-alias-bg-layer-2)' }),
      h('path', {
        key: 'folder',
        d: 'M11 17h10l3 3h13v14a2 2 0 0 1-2 2H13a2 2 0 0 1-2-2V17Z',
        fill: 'var(--dsw-alias-state-warn-primary)',
        opacity: 0.22,
        stroke: 'var(--dsw-alias-state-warn-primary)',
        strokeWidth: 1.6,
      }),
      h('path', { key: 'q1', d: 'M19 26h4M25 26h4M19 31h10', stroke: 'var(--dsw-alias-label-secondary)', strokeWidth: 1.6, strokeLinecap: 'round' }))
    }

    function useLocale(ctx) {
      ctx.effect(() => ctx.locale.register(NS, {
        zh: flattenDictionary(zh),
        en: flattenDictionary(en),
      }), 'read-doc: dictionaries')
      return ctx.locale.bind(NS)
    }

    function workspaceTitle(workspace) {
      return workspace.title || baseName(workspace.path) || workspace.path
    }

    function findWorkspaceForPath(workspaces, absolutePath) {
      const target = normalizeSlashes(absolutePath)
      let best
      for (const workspace of workspaces) {
        if (!workspace?.path) continue
        if (!isInside(workspace.path, target)) continue
        if (!best || workspace.path.length > best.path.length) best = workspace
      }
      return best
    }

    function FilesTitle({ useTabInfo }) {
      const info = useTabInfo()
      return h(Fragment, null,
        h('span', { className: 'rd-title-icon' }, h(FolderIcon, { size: 15 })),
        info?.tab?.title ?? '')
    }

    function createFilesTab(ctx, t) {
      return function FilesTab(props) {
        const workspaceSnapshot = props.useWorkspaces((state) => state)
        const workspaces = workspaceSnapshot?.items
        const workspaceLoading = workspaceSnapshot?.phase !== undefined && workspaceSnapshot.phase !== 'ready'
        const sessionsById = typeof props.useSessions === 'function'
          ? props.useSessions((state) => state.byId)
          : undefined
        const currentSummary = sessionsById?.[props.sessionId]
        const currentSession = props.useSession((session) => session)
        const currentCwd = currentSummary?.cwd ?? currentSession?.cwd
        const tabInfo = typeof props.useTabInfo === 'function' ? props.useTabInfo() : undefined
        const [expandedDirs, setExpandedDirs] = useState(() => new Set())
        const [levels, setLevels] = useState({})
        const [notice, setNotice] = useState(null)
        const levelsRef = useRef(levels)
        levelsRef.current = levels
        const loadingRef = useRef(new Set())
        const dragRef = useRef({ path: null, at: 0 })

        const safeWorkspaces = Array.isArray(workspaces) ? workspaces : []
        const workspaceByPath = currentCwd
          ? safeWorkspaces.find((workspace) => samePath(workspace.path, currentCwd))
          : undefined
        const workspaceByMembership = safeWorkspaces.find((workspace) => (
          Array.isArray(workspace.sessionIds) && workspace.sessionIds.includes(props.sessionId)
        ))
        const workspaceByCwd = currentCwd
          ? findWorkspaceForPath(safeWorkspaces, currentCwd)
          : undefined
        const activeWorkspace = workspaceByPath ?? workspaceByMembership ?? workspaceByCwd
        const activePath = activeWorkspace?.path ?? ''

        const loadDirectory = useCallback(async (directory, force) => {
          const current = levelsRef.current[directory]
          if (!force && current?.status === 'ready') return
          if (loadingRef.current.has(directory)) return
          loadingRef.current.add(directory)
          setLevels((previous) => ({
            ...previous,
            [directory]: {
              status: 'loading',
              entries: previous[directory]?.entries ?? [],
              truncated: previous[directory]?.truncated ?? false,
              limit: previous[directory]?.limit ?? 0,
            },
          }))
          try {
            const result = await listDirectory(directory)
            setLevels((previous) => ({
              ...previous,
              [directory]: {
                status: 'ready',
                entries: result.entries,
                truncated: result.truncated === true,
                limit: Number(result.limit) || 4000,
              },
            }))
          } catch (error) {
            setLevels((previous) => ({
              ...previous,
              [directory]: {
                status: 'error',
                entries: previous[directory]?.entries ?? [],
                limit: previous[directory]?.limit ?? 0,
                message: error instanceof Error ? error.message : String(error),
              },
            }))
          } finally {
            loadingRef.current.delete(directory)
          }
        }, [])

        useEffect(() => {
          loadingRef.current.clear()
          setExpandedDirs(new Set())
          setLevels({})
          if (activePath !== '') void loadDirectory(activePath, true)
        }, [activePath, loadDirectory])

        useEffect(() => {
          if (!notice) return undefined
          const timer = setTimeout(() => setNotice(null), 7000)
          return () => clearTimeout(timer)
        }, [notice])

        const toggleDirectory = (directory) => {
          if (Date.now() - dragRef.current.at < 300) return
          setExpandedDirs((previous) => {
            const next = new Set(previous)
            if (next.has(directory)) next.delete(directory)
            else next.add(directory)
            return next
          })
          if (!expandedDirs.has(directory)) void loadDirectory(directory, false)
        }

        const refresh = () => {
          if (!activeWorkspace) return
          loadingRef.current.clear()
          setLevels({})
          void loadDirectory(activePath, true)
          for (const directory of expandedDirs) void loadDirectory(directory, true)
        }

        const openFile = (entry) => {
          if (Date.now() - dragRef.current.at < 300 || !activeWorkspace) return
          const sessionIds = Array.isArray(activeWorkspace.sessionIds) ? activeWorkspace.sessionIds : []
          const cwdInsideWorkspace = currentCwd !== undefined && isInside(activeWorkspace.path, currentCwd)
          const sessionId = props.sessionId && (cwdInsideWorkspace || sessionIds.includes(props.sessionId))
            ? props.sessionId
            : sessionIds[0]
          if (!sessionId) {
            setNotice(t('files.noSession'))
            return
          }
          const address = addressFor(sessionId, activeWorkspace.path, entry.path)
          const opener = tabInfo?.tab?.actions?.openResource
          try {
            if (typeof opener === 'function') {
              opener(address, { params: { line: 1 } })
            } else {
              const sidebar = ctx.get('sidebarRight')
              if (!sidebar?.openResource) {
                setNotice(t('files.noEditor'))
                return
              }
              sidebar.openResource(address, { params: { line: 1 } })
            }
          } catch (error) {
            const sidebar = ctx.get('sidebarRight')
            if (sidebar?.openResource) {
              try {
                sidebar.openResource(address, { params: { line: 1 } })
                return
              } catch {
                /* report the original failure below */
              }
            }
            setNotice(t('files.openFailed', { message: error instanceof Error ? error.message : String(error) }))
          }
        }

        const startDrag = (event, entry) => {
          if (!activeWorkspace) return
          const relative = entry.relative || baseName(entry.path)
          const referencePath = entry.type === 'directory'
            ? `${relative.replace(/\/+$/, '')}/`
            : relative
          const payload = {
            path: entry.path,
            relative,
            name: entry.name,
            type: entry.type,
            workspace: activeWorkspace.path,
            sessionId: (currentCwd !== undefined && isInside(activeWorkspace.path, currentCwd))
              ? props.sessionId
              : (activeWorkspace.sessionIds?.[0] ?? props.sessionId ?? null),
          }
          event.dataTransfer.setData(DRAG_MIME, JSON.stringify(payload))
          event.dataTransfer.setData('text/plain', formatMention(referencePath))
          event.dataTransfer.effectAllowed = 'copy'
          dragRef.current.path = entry.path
        }

        const endDrag = () => {
          dragRef.current.path = null
          dragRef.current.at = Date.now()
        }

        const renderLevel = (directory, depth) => {
          const level = levels[directory]
          if (!level || level.status === 'loading' && !level.entries?.length) {
            return h('div', { className: 'rd-muted', key: `${directory}:loading` }, t('files.loading'))
          }
          if (level.status === 'error') {
            return h('div', { className: 'rd-error', key: `${directory}:error` },
              t('files.listFailed', { message: level.message ?? 'unknown' }),
              h('button', {
                type: 'button',
                className: 'rd-inline-link',
                onClick: () => void loadDirectory(directory, true),
              }, t('files.retry')))
          }
          const entries = [...(level.entries ?? [])].sort((left, right) => {
            const rank = (entry) => (entry.type === 'directory' ? 0 : entry.type === 'file' ? 1 : 2)
            const byRank = rank(left) - rank(right)
            if (byRank !== 0) return byRank
            return String(left.name).localeCompare(String(right.name), undefined, {
              numeric: true,
              sensitivity: 'base',
            })
          })
          if (entries.length === 0) {
            return h('div', { className: 'rd-muted', key: `${directory}:empty` }, t('files.emptyDir'))
          }
          const rows = []
          for (const entry of entries) {
            const padding = { paddingLeft: `${6 + depth * 12}px` }
            if (entry.type === 'directory') {
              const expanded = expandedDirs.has(entry.path)
              rows.push(h('button', {
                key: entry.path,
                type: 'button',
                className: 'rd-row rd-row--dir',
                style: padding,
                title: entry.path,
                draggable: true,
                onClick: () => toggleDirectory(entry.path),
                onDragStart: (event) => startDrag(event, entry),
                onDragEnd: endDrag,
              },
              h('span', { className: expanded ? 'rd-chevron rd-chevron--open' : 'rd-chevron' }, h(ChevronIcon, { size: 12 })),
              h('span', { className: 'rd-icon rd-icon--folder' }, h(FolderIcon, { size: 15 })),
              h('span', { className: 'rd-name' }, entry.name)))
              if (expanded) rows.push(renderLevel(entry.path, depth + 1))
            } else if (entry.type === 'file') {
              rows.push(h('div', {
                key: entry.path,
                className: 'rd-row rd-row--file',
                style: padding,
                role: 'button',
                tabIndex: 0,
                draggable: true,
                title: t('files.openTitle', { path: entry.path }),
                onClick: () => openFile(entry),
                onKeyDown: (event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    openFile(entry)
                  }
                },
                onDragStart: (event) => startDrag(event, entry),
                onDragEnd: endDrag,
              },
              h('span', { className: 'rd-spacer' }),
              h('span', { className: 'rd-icon rd-icon--file' }, h(FileTypeIcon, { name: entry.name, size: 18 })),
              h('span', { className: 'rd-name' }, entry.name),
              entry.size !== null && entry.size !== undefined
                ? h('span', { className: 'rd-size' }, formatSize(entry.size))
                : null))
            } else {
              rows.push(h('div', {
                key: entry.path,
                className: 'rd-row',
                style: { ...padding, opacity: 0.55 },
                title: entry.path,
              },
              h('span', { className: 'rd-spacer' }),
              h('span', { className: 'rd-icon rd-icon--file' }, h(FileTypeIcon, { name: entry.name, size: 18 })),
              h('span', { className: 'rd-name' }, entry.name)))
            }
          }
          if (level.truncated) {
            rows.push(h('div', { className: 'rd-muted', key: `${directory}:truncated` }, t('files.truncated', { count: level.limit ?? 4000 })))
          }
          return h(Fragment, { key: directory }, rows)
        }

        return h('div', { className: 'rd-root' },
          h('div', { className: 'rd-toolbar' },
            h('div', { className: 'rd-toolbar-title' },
              h(FolderIcon, { size: 16 }),
              h('span', null, t('files.tabTitle')),
              h('span', { className: 'rd-toolbar-sub' }, t('files.currentWorkspace'))),
            h('button', {
              type: 'button',
              className: 'rd-icon-btn',
              title: t('files.refresh'),
              'aria-label': t('files.refresh'),
              onClick: refresh,
              disabled: !activeWorkspace,
            }, h(RefreshIcon, { size: 15 }))),
          h('div', { className: 'rd-hint' }, t('files.hint')),
          notice ? h('div', { className: 'rd-notice', role: 'alert' }, notice) : null,
          h('div', { className: 'rd-scroll' },
            !activeWorkspace
              ? h('div', { className: 'rd-empty' },
                workspaceLoading ? t('files.loading') : t('files.noCurrentWorkspace'))
              : h('section', { className: 'rd-workspace' },
                h('div', { className: 'rd-workspace-head rd-workspace-head--static', title: activeWorkspace.path },
                  h('span', { className: 'rd-icon rd-icon--folder' }, h(FolderIcon, { size: 16 })),
                  h('span', { className: 'rd-workspace-text' },
                    h('span', { className: 'rd-workspace-title' },
                      h('span', null, workspaceTitle(activeWorkspace)),
                      h('span', { className: 'rd-badge' }, t('files.sessions', { count: activeWorkspace.sessionIds?.length ?? 0 }))),
                    h('span', { className: 'rd-path', title: activeWorkspace.path }, activeWorkspace.path))),
                h('div', { className: 'rd-workspace-body' }, renderLevel(activePath, 0)))))
      }
    }

    function createQuoteAction(ctx, t) {
      return function QuoteAction(props) {
        const absolutePath = typeof props.absolutePath === 'string' ? props.absolutePath : ''
        const input = props.useInput((state) => state)
        const workspaces = props.useWorkspaces((state) => state.items)
        const [menu, setMenu] = useState(null)
        const [hint, setHint] = useState('')
        const [fileText, setFileText] = useState('')
        const buttonRef = useRef(null)
        const menuRef = useRef(null)
        const timerRef = useRef(null)
        const latestRef = useRef({})
        latestRef.current = {
          absolutePath,
          input,
          workspaces,
          fileText,
          inputActions: props.inputActions,
        }

        useEffect(() => {
          let cancelled = false
          if (!absolutePath) {
            setFileText('')
            return undefined
          }
          const cached = getCachedText(absolutePath)
          if (cached !== undefined) {
            setFileText(cached)
            return undefined
          }
          readFile(absolutePath)
            .then((result) => {
              if (cancelled) return
              cacheText(absolutePath, result.text)
              setFileText(result.text)
            })
            .catch(() => {
              if (!cancelled) setFileText('')
            })
          return () => {
            cancelled = true
          }
        }, [absolutePath])

        useEffect(() => {
          const api = {
            get absolutePath() {
              return latestRef.current.absolutePath
            },
            get fileText() {
              return latestRef.current.fileText
            },
            openMenu: (x, y, quote) => {
              const width = 230
              const height = 132
              setMenu({
                x: Math.max(8, Math.min(x, window.innerWidth - width - 8)),
                y: Math.max(8, Math.min(y, window.innerHeight - height - 8)),
                quote,
              })
            },
          }
          quoteHost = api
          return () => {
            if (quoteHost === api) quoteHost = null
          }
        }, [])

        useEffect(() => {
          if (!menu) return undefined
          const onPointerDown = (event) => {
            if (menuRef.current && menuRef.current.contains(event.target)) return
            setMenu(null)
          }
          const onKeyDown = (event) => {
            if (event.key === 'Escape') setMenu(null)
          }
          const onScroll = () => setMenu(null)
          document.addEventListener('pointerdown', onPointerDown, true)
          document.addEventListener('keydown', onKeyDown, true)
          window.addEventListener('resize', onScroll)
          document.addEventListener('scroll', onScroll, true)
          return () => {
            document.removeEventListener('pointerdown', onPointerDown, true)
            document.removeEventListener('keydown', onKeyDown, true)
            window.removeEventListener('resize', onScroll)
            document.removeEventListener('scroll', onScroll, true)
          }
        }, [menu])

        useEffect(() => () => {
          if (timerRef.current !== null) clearTimeout(timerRef.current)
        }, [])

        const showHint = (message) => {
          setHint(message)
          if (timerRef.current !== null) clearTimeout(timerRef.current)
          timerRef.current = setTimeout(() => setHint(''), 2400)
        }

        const quoteLabel = (quote) => {
          const current = latestRef.current
          const workspace = findWorkspaceForPath(current.workspaces ?? [], quote.path)
          const relative = workspace ? relativeInside(workspace.path, quote.path) : baseName(quote.path)
          const file = relative || baseName(quote.path)
          return {
            file,
            mention: formatMention(relative || quote.path),
            label: t('quote.label', { file, start: quote.start, end: quote.end }),
          }
        }

        const applyQuote = (quote) => {
          if (!quote) return
          const current = latestRef.current
          const info = quoteLabel(quote)
          const clipboardText = `${info.mention} L${quote.start}-L${quote.end}`
          const ok = appendReference(current.input, current.inputActions, {
            source: QUOTE_SOURCE,
            ref: quoteRefFor(quote.path, quote.start, quote.end, info.mention),
            label: info.label,
            clipboardText,
            appearance: 'file',
          })
          setMenu(null)
          if (!ok) {
            showHint(t('quote.failed'))
            return
          }
          showHint(t('quote.done'))
        }

        const copySelection = async (quote) => {
          setMenu(null)
          try {
            await navigator.clipboard.writeText(quote.text)
            showHint(t('quote.copied'))
          } catch {
            showHint(t('quote.failed'))
          }
        }

        const pendingQuoteRef = useRef(null)

        const openFromButton = (event) => {
          event?.preventDefault?.()
          const quote = pendingQuoteRef.current ?? computeQuote(latestRef.current, true)
          pendingQuoteRef.current = null
          if (!quote) {
            showHint(t('quote.noSelection'))
            return
          }
          const rect = buttonRef.current?.getBoundingClientRect()
          const x = rect ? rect.left : 24
          const y = rect ? rect.bottom + 4 : 48
          const width = 230
          const height = 132
          setMenu({
            x: Math.max(8, Math.min(x, window.innerWidth - width - 8)),
            y: Math.max(8, Math.min(y, window.innerHeight - height - 8)),
            quote,
          })
        }

        if (!absolutePath) return null

        return h(Fragment, null,
          h('span', { className: 'rd-quote-wrap' },
            h('button', {
              ref: buttonRef,
              type: 'button',
              className: 'rd-icon-btn',
              title: t('quote.title'),
              'aria-label': t('quote.action'),
              onMouseDown: (event) => {
                event.preventDefault()
                pendingQuoteRef.current = computeQuote(latestRef.current, true)
              },
              onClick: openFromButton,
            }, h(QuoteIcon, { size: 15 })),
            hint ? h('span', { className: 'rd-quote-hint' }, hint) : null),
          menu ? h('div', {
            ref: menuRef,
            className: 'rd-quote-menu',
            style: { left: `${menu.x}px`, top: `${menu.y}px` },
            role: 'menu',
          },
          h('div', { className: 'rd-quote-menu-title' },
            h('span', null, t('quote.menuTitle')),
            h('span', { className: 'rd-quote-menu-label' }, quoteLabel(menu.quote).label)),
          h('button', {
            type: 'button',
            role: 'menuitem',
            onClick: () => applyQuote(menu.quote),
          }, t('quote.quote')),
          h('div', { className: 'rd-quote-menu-sep' }),
          h('button', {
            type: 'button',
            role: 'menuitem',
            onClick: () => void copySelection(menu.quote),
          }, t('quote.copy'))) : null)
      }
    }

    function createComposerButton(ctx, t) {
      return function ComposerFilesButton(props) {
        const input = props.useInput((state) => state)
        const session = props.useSession((snapshot) => snapshot)
        const latestRef = useRef({})
        latestRef.current = {
          input,
          session,
          inputActions: props.inputActions,
        }

        useEffect(() => {
          const api = {
            appendFile(payload) {
              if (!payload || typeof payload.path !== 'string') return false
              const current = latestRef.current
              const directory = payload.type === 'directory'
              const cwd = current.session?.cwd
              let relative = cwd && isInside(cwd, payload.path)
                ? relativeInside(cwd, payload.path)
                : normalizeSlashes(payload.path)
              if (directory) relative = `${relative.replace(/\/+$/, '')}/`
              const mention = formatMention(relative)
              const name = payload.name || baseName(payload.path)
              return appendReference(current.input, current.inputActions, {
                source: 'reference',
                ref: mention,
                label: directory ? `${name.replace(/\/+$/, '')}/` : name,
                clipboardText: mention,
                appearance: directory ? 'folder' : 'file',
                trailing: directory ? '\n' : '',
              })
            },
          }
          composerHost = api
          return () => {
            if (composerHost === api) composerHost = null
          }
        }, [])

        return h('button', {
          type: 'button',
          className: 'rd-icon-btn rd-composer-btn',
          title: t('files.tabTitle'),
          'aria-label': t('files.tabTitle'),
          onClick: () => {
            const sidebar = ctx.get('sidebarRight')
            if (!sidebar?.openTab) return
            try {
              sidebar.openTab(KIND)
            } catch {
              /* the tab registry reports the wiring error */
            }
          },
        }, h(FolderIcon, { size: 16 }))
      }
    }

    let quoteHost = null
    let composerHost = null

    function apply(ctx) {
      const t = useLocale(ctx)

      ctx.effect(() => {
        const tag = document.createElement('style')
        tag.dataset.plugin = ID
        tag.textContent = CSS
        document.head.appendChild(tag)
        return () => {
          tag.remove()
        }
      }, 'read-doc: styles')

      const tabs = ctx.get('sidebarRightTabs')
      const triggers = ctx.get('inputTriggers')

      if (tabs?.register) {
        ctx.effect(() => tabs.register({
          id: ID,
          kind: KIND,
          priority: 'extension',
          keepMounted: true,
          title: () => t('files.tabTitle'),
          guide: [{
            id: 'read-doc-files',
            order: 20,
            title: () => t('files.guideTitle'),
            description: () => t('files.guideDescription'),
            icon: GuideArtwork,
          }],
        }), 'read-doc: tab type')
      }

      ctx.effect(() => ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({
        name: 'sidebar.right.pane.tab',
        key: ID,
        locale: NS,
      }, createFilesTab(ctx, t))), 'read-doc: files tab body')

      ctx.effect(() => ctx.slots.inject('sidebar.right.pane.tab.title', () => ctx.slots.register({
        name: 'sidebar.right.pane.tab.title',
        key: ID,
      }, FilesTitle)), 'read-doc: files tab title')

      ctx.effect(() => ctx.slots.inject('conversation.input.left', () => ctx.slots.register({
        name: 'conversation.input.left',
        id: 'read-doc-files',
        order: 30,
        locale: NS,
      }, createComposerButton(ctx, t))), 'read-doc: composer entry')

      ctx.effect(() => ctx.slots.inject('sidebar.right.tab.document.actions', () => ctx.slots.register({
        name: 'sidebar.right.tab.document.actions',
        id: 'read-doc-quote',
        order: 20,
        locale: NS,
      }, createQuoteAction(ctx, t))), 'read-doc: quote action')

      if (triggers?.registerSource) {
        ctx.effect(() => triggers.registerSource({
          trigger: '@',
          name: QUOTE_SOURCE,
          showGroupTitle: false,
          async candidates() {
            return []
          },
          codec: {
            clipboardText(ref) {
              return quoteModelText(parseQuoteRef(ref))
            },
            serialize(ref) {
              const parsed = parseQuoteRef(ref)
              if (!parsed) return Promise.reject(new Error('read-doc: malformed quote reference'))
              return Promise.resolve(quoteModelText(parsed))
            },
          },
          openReference(session, reference) {
            const parsed = parseQuoteRef(reference?.ref)
            const currentSidebar = ctx.get('sidebarRight')
            if (!parsed || !currentSidebar?.openResource || !session?.sessionId) return false
            try {
              currentSidebar.openResource(addressFor(session.sessionId, undefined, parsed.path), {
                params: { line: parsed.start },
              })
              return true
            } catch {
              return false
            }
          },
        }), 'read-doc: quote reference source')
      }

      ctx.effect(() => {
        const isEditable = (target) => target instanceof Element
          && target.closest('[contenteditable="true"]') !== null

        const hasDrag = (event) => {
          const types = event.dataTransfer?.types
          if (!types) return false
          return Array.prototype.indexOf.call(types, DRAG_MIME) !== -1
        }

        const onDragOver = (event) => {
          if (!hasDrag(event) || !isEditable(event.target) || !composerHost?.appendFile) return
          event.preventDefault()
          event.stopPropagation()
          if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
        }

        const onDrop = (event) => {
          if (!hasDrag(event) || !isEditable(event.target) || !composerHost?.appendFile) return
          event.preventDefault()
          event.stopPropagation()
          const payloadText = event.dataTransfer.getData(DRAG_MIME)
          if (!payloadText) return
          let payload
          try {
            payload = JSON.parse(payloadText)
          } catch {
            return
          }
          const appended = composerHost.appendFile(payload)
          if (appended && event.target instanceof Element) {
            const editor = event.target.closest('[contenteditable="true"]')
            if (editor && typeof editor.focus === 'function') editor.focus({ preventScroll: true })
          }
        }

        const onContextMenu = (event) => {
          if (!quoteHost) return
          if (event.target instanceof Element && event.target.closest('[contenteditable="true"]') !== null) return
          const quote = computeQuote(quoteHost, false)
          if (!quote) return
          event.preventDefault()
          event.stopPropagation()
          quoteHost.openMenu(event.clientX, event.clientY, quote)
        }

        document.addEventListener('dragover', onDragOver, true)
        document.addEventListener('drop', onDrop, true)
        document.addEventListener('contextmenu', onContextMenu, true)
        return () => {
          document.removeEventListener('dragover', onDragOver, true)
          document.removeEventListener('drop', onDrop, true)
          document.removeEventListener('contextmenu', onContextMenu, true)
        }
      }, 'read-doc: document listeners')

      return () => {
        quoteHost = null
        composerHost = null
      }
    }

    return {
      inject: ['slots', 'locale', 'sidebarRight', 'sidebarRightTabs', 'inputTriggers'],
      apply,
    }
  },
})
