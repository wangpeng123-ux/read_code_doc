# Workspace Files for DeepSeek Harness

English | [中文](README.zh-CN.md)

A read-only file browser for the DSH Web UI. It lives in the right sidebar, shows the **current workspace only**, opens files in the built-in DSH document preview, and turns files or selected line ranges into references in the composer.

Built for DeepSeek Harness versions that provide `ui-conversation`, `ui-sidebar-right`, `ui-sidebar-documentpreview`, `ui-input-trigger`, and `ui-reference`.

## Features

- **Current workspace only** — the tab resolves the workspace from the active session's `cwd`, then shows that workspace's root path and full tree. Other workspaces are not mixed in.
- **Full directory tree** — lazy directory loading, hidden files included, directories first, manual refresh, and a notice when a directory exceeds the transfer limit.
- **File-type icons** — 50+ extension, filename, and pattern mappings (JS/TS/JSON/Markdown, Python/Rust/Go/Java, images/audio/video, PDF/Office, archives, fonts, databases, Git/Docker/config files, and more). Icons are inline SVG.
- **Drag to reference** — drag a file row onto the composer. The plugin inserts a DSH file-reference chip; the model receives the `@path` mention.
- **Open in the DSH editor surface** — click a file to open it through `ui-sidebar-documentpreview`. Supported formats are exactly those of the built-in preview (code, plain text, Markdown, images, PDF, Office files, and so on).
- **Quote selected lines** — select text in a code or plain-text preview, right-click, and choose **Quote in composer**. The composer shows a chip such as `【client.js，第 12-18 行】`; clicking it opens the file at line 12.
- **Read-only and workspace-scoped** — the Host reads through `ctx.fs`, refuses paths outside registered workspaces, and never writes, renames, or deletes files.

## Requirements

- DeepSeek Harness Desktop or Web with a **managed profile** and the **Plugins** page.
- The DSH installation must include the five UI packages listed above. They are part of the standard Web composition.
- A workspace with at least one session, so the built-in preview has a session that can authorize file reads.

No build step, no native addon, and no runtime dependency beyond what DSH already provides.

## Installation

### From a local clone (recommended while developing)

1. Clone the repository:

   ```bash
   git clone https://github.com/<your-account>/dsh-read-doc.git
   cd dsh-read-doc
   ```

2. Open DSH and select **Plugins** in the sidebar.

3. Click **Add plugin** → **Install a third-party plugin**.

4. Enter the **absolute path** of the cloned folder, for example:

   ```text
   C:\Users\you\Documents\dsh-plugin\read-doc
   ```

   or:

   ```text
   /Users/you/dsh-plugin/read-doc
   ```

5. Click **Install**. Wait for pnpm and bundle validation to finish. The bundle is selected/enabled by default.

6. If DSH reports that a refresh or restart is required, do it. Otherwise refresh the page once.

7. Open a session. A folder button appears at the **left of the composer toolbar**. Click it to open the **Workspace Files** tab.

### From GitHub after publishing

Paste the repository URL (or a release tarball URL) into the same **Install a third-party plugin** dialog:

```text
https://github.com/<your-account>/dsh-read-doc
```

The plugin has no install scripts, so there are no build scripts to approve.

### Updating and uninstalling

- Third-party bundles are updated by removing and reinstalling them, or by installing the newer local path.
- Uninstall from **Plugins → Workspace Files → Remove**. The source folder is not deleted.
- For a linked local checkout, editing `client.js` is picked up by the DSH client HMR when it is active; otherwise refresh the page.

## Usage

### Open the file tab

- Click the folder icon at the left of the composer toolbar.
- Or open the right sidebar's `+` guide and choose **Workspace Files**.

The tab is kept alive while switching between preview files, so expanded directories and scroll state survive.

### Browse and open

- Click a directory to expand/collapse it.
- Click a file to open it in the DSH document preview in the right sidebar.
- Use the refresh button in the tab header after files change on disk.

### Drag a file into the conversation

Drag a file row from the tab and drop it on the composer text area. A file-reference chip is inserted. Paths inside the current session's workspace are relative; outside paths are absolute.

### Quote selected lines

1. Open a file in the DSH preview.
2. Select text in the code or plain-text renderer.
3. Right-click and choose **Quote in composer**.
4. The composer shows a chip such as `【client.js，第 12-18 行】`.
5. Click the chip to reopen the file and jump to the starting line.

The serialized model text is `@client.js L12-L18`, so the model receives both the file reference and the line range. Markdown selections are matched back to the source when the selected text can be located exactly; complex inline formatting may not resolve.

## File icons and the import template

Icons are data-driven. The maps live in [`client.js`](client.js):

- `FILE_ICON_STYLES` — badge/glyph appearance
- `FILE_ICON_GLYPHS` — optional SVG glyph functions
- `FILE_ICON_BY_EXTENSION` — extension → icon key
- `FILE_ICON_BY_NAME` — exact filename → icon key
- `FILE_ICON_PATTERNS` — regex rule → icon key

The complete extension template and examples are in [`FILE-ICONS.md`](FILE-ICONS.md). The shortest way to add a new type is:

```js
FILE_ICON_BY_EXTENSION.foo = 'foo'

FILE_ICON_STYLES.foo = {
  label: 'FOO',
  bg: '#0F766E',
  fg: '#FFFFFF',
}
```

For a filename rule:

```js
FILE_ICON_BY_NAME['my.config'] = 'foo'
```

For a graphical icon, add a function to `FILE_ICON_GLYPHS` and reference it with `glyph: 'myGlyph'` in `FILE_ICON_STYLES`.

Resolution order is: exact filename → regex patterns → dotfile config → extension → default file icon.

## How it works

### Host half (`index.js`)

The Host registers two read-only routes:

```text
GET /read-doc/api/list?path=<absolute directory>
GET /read-doc/api/read?path=<absolute file>
```

- Only loopback callers and same-origin requests are accepted.
- Every path is resolved with `ctx.fs.resolve`.
- The resolved target must be contained by a directory returned by `ctx.workspaceRegistry.list()`; otherwise the request is rejected with `403`.
- Listing returns direct children only. Reading returns UTF-8 text up to 4 MiB.
- Requests are read-only; no mutation endpoint exists.

### Client half (`client.js`)

- Registers the right-sidebar tab type, body, and title.
- Registers the composer-toolbar entry.
- Registers a header action in the document preview for line selection.
- Adds a custom `@` reference source with a codec, so quote chips can be serialized at submit time.
- Installs document-level `dragover`/`drop` capture handlers for file-row drags.

## Repository layout

| File | Purpose |
| --- | --- |
| `index.js` | Host routes, workspace containment, directory listing, text reads |
| `client.js` | Sidebar tab, tree, drag/drop, preview quote action, file icons |
| `FILE-ICONS.md` | File-icon extension template |
| `locale/en.json`, `locale/zh.json` | Plugin Manager title/description |
| `icon.svg` | Plugin icon |
| `cordis.patch.yml` | Bundle row |
| `package.json` | Bundle manifest and DSH client declaration |

## Known limitations

- The current workspace needs a session. A workspace with no session cannot use the built-in preview.
- File rendering is provided by DSH's document preview; this plugin does not ship another editor.
- Line-range quoting is most accurate for code and plain text. Markdown is best-effort. PDF/Office text selection does not produce line quotes.
- Text reads are capped at 4 MiB; binary or invalid UTF-8 files are not returned as text.
- A directory with more than 10,000 direct entries is truncated with a notice.
- The tree does not watch the filesystem; use the refresh button.
- No write, rename, delete, upload, or file creation operations.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| No folder button | Refresh the page, confirm the bundle is enabled in **Plugins**, and confirm the DSH version has the required UI packages. |
| “No matching workspace folder” | Make sure the session has a `cwd` and belongs to a registered workspace. Open a new session in that workspace if needed. |
| “No session” when opening a file | Start a session in the workspace first; the preview needs a session to authorize reads. |
| “No serializer for reference source” | Update to the current version; older builds lacked the quote reference codec. |
| Quote chip does not jump to the line | The active preview renderer may not expose line anchors, or the file changed since the quote was created. |
| File listing fails | Confirm the file is inside a registered workspace and the DSH Host can read it. |

## Publishing to GitHub

The repository is already initialized. To publish:

```bash
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<your-account>/dsh-read-doc.git
git push -u origin main
```

Replace `<your-account>` with your GitHub username.

## License

No license is declared yet. Add a `LICENSE` file before distributing the project if you want others to reuse it.
