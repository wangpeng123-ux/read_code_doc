# DSH 工作区文件 / Workspace Files

[English](README.md) | 中文

一个运行在 DSH Web UI 右侧栏的**只读工作区文件浏览器**。它只显示当前会话所在的工作区，支持目录树、拖拽引用、用 DSH 内置文档预览查看文件，以及把选中的行范围引用到对话框。

适用于提供 `ui-conversation`、`ui-sidebar-right`、`ui-sidebar-documentpreview`、`ui-input-trigger`、`ui-reference` 的 DeepSeek Harness 版本。

## 功能

- **只显示当前工作区**：根据当前会话的 `cwd` 定位工作区，只展示这个工作区的根路径和完整目录树，不混合其他工作区。
- **完整目录树**：目录按需加载，显示隐藏文件，文件夹优先排序，支持手动刷新；超大目录会显示截断提示。
- **按类型显示文件图标**：内置 50+ 种后缀、文件名和正则规则，覆盖 JS/TS/JSON/Markdown、Python/Rust/Go/Java、图片/音频/视频、PDF/Office、压缩包、字体、数据库、Git/Docker/配置文件等。图标全部是内联 SVG。
- **拖到对话框引用**：把文件或文件夹行拖到输入框，自动插入 DSH 引用 chip，模型收到 `@路径` 或 `@文件夹/`。
- **用 DSH 编辑器查看**：点击文件通过内置 `ui-sidebar-documentpreview` 打开。可查看的格式由 DSH 内置预览决定，包括代码、纯文本、Markdown、图片、PDF、Office 等。
- **选中行右键引用**：在代码或纯文本预览中选中内容，右键选择「引用到对话框」。输入框显示形如 `【client.js，第 12-18 行】` 的 chip，点击会重新打开文件并跳到起始行。
- **只读、限定工作区**：Host 通过 `ctx.fs` 读取，拒绝工作区之外的路径，不写入、不重命名、不删除文件。

## 环境要求

- DeepSeek Harness Desktop 或 Web，并启用托管 profile 和 **Plugins** 页面。
- DSH 安装中包含上面列出的五个 UI 包（标准 Web 组合里都有）。
- 工作区至少有一个会话，内置预览需要一个会话来授权文件读取。

不需要构建，不需要原生模块，也没有 DSH 之外的运行时依赖。

## 安装

### 从本地目录安装（开发时推荐）

1. 克隆仓库：

   ```bash
   git clone https://github.com/<your-account>/dsh-read-doc.git
   cd dsh-read-doc
   ```

2. 打开 DSH，点击左侧栏的 **Plugins**。

3. 点击 **Add plugin** → **Install a third-party plugin**。

4. 填写克隆目录的**绝对路径**，例如：

   ```text
   C:\Users\you\Documents\dsh-plugin\read-doc
   ```

   或：

   ```text
   /Users/you/dsh-plugin/read-doc
   ```

5. 点击 **Install**，等待 pnpm 和 bundle 校验完成。插件默认会被选中并启用。

6. 如果 DSH 提示需要刷新或重启，按提示操作；否则刷新一次页面。

7. 打开一个会话。输入框工具栏左侧会出现文件夹按钮，点击即可打开 **工作区文件** 标签。

### 从 GitHub 安装（发布之后）

在同一个 **Install a third-party plugin** 对话框中填入仓库地址或 release tarball 地址：

```text
https://github.com/<your-account>/dsh-read-doc
```

插件没有安装脚本，所以不需要批准构建脚本。

### 更新和卸载

- 第三方 bundle 的更新方式是先移除再重新安装，或安装新的本地路径。
- 在 **Plugins → Workspace Files → Remove** 卸载；不会删除本地源码目录。
- 如果是本地 link 安装，修改 `client.js` 后，DSH Client HMR 可用时会自动更新；否则刷新页面。

## 使用

### 打开文件标签

- 点击输入框左侧工具栏的文件夹图标。
- 或打开右侧栏的 `+` 指南，选择 **工作区文件**。

标签会常驻，切换文件预览时不会丢失目录展开状态和滚动位置。

### 浏览和打开文件

- 点击目录展开/折叠。
- 点击文件在右侧栏的 DSH 文档预览中打开。
- 文件在磁盘上变化后，点击标签头部的刷新按钮。

### 拖文件或文件夹到对话

从文件树拖动文件或文件夹行，放到输入框文本区域。插件会插入引用 chip；文件夹使用带尾斜杠的 mention，例如 `@src/`，并在 chip 后自动加一个换行，后续输入从下一行开始。文件夹引用在序列化时会额外带一个分隔空格，所以即使你删掉插入的换行，后面的文字也会保持为普通文本，不会并进路径。当前会话工作区内的路径使用相对路径，工作区外的路径使用绝对路径。

### 引用选中行

1. 在 DSH 预览中打开文件。
2. 在代码或纯文本中选中内容。
3. 右键选择 **Quote in composer / 引用到对话框**。
4. 输入框显示 `【client.js，第 12-18 行】`。
5. 点击 chip 会重新打开文件并跳到起始行。

发送时序列化给模型的文本是 `@client.js L12-L18`，模型能同时看到文件引用和行范围。Markdown 会尝试把选中文本匹配回源文件；复杂行内格式可能无法定位。

## 文件图标与导入模板

图标是数据驱动的，定义在 [`client.js`](client.js)：

- `FILE_ICON_STYLES`：徽标/图形外观
- `FILE_ICON_GLYPHS`：可选的 SVG 图形函数
- `FILE_ICON_BY_EXTENSION`：后缀 → 图标键
- `FILE_ICON_BY_NAME`：精确文件名 → 图标键
- `FILE_ICON_PATTERNS`：正则规则 → 图标键

完整模板和示例见 [`FILE-ICONS.md`](FILE-ICONS.md)。新增一个后缀最短只需要两行：

```js
FILE_ICON_BY_EXTENSION.foo = 'foo'

FILE_ICON_STYLES.foo = {
  label: 'FOO',
  bg: '#0F766E',
  fg: '#FFFFFF',
}
```

按文件名匹配：

```js
FILE_ICON_BY_NAME['my.config'] = 'foo'
```

需要图形图标时，在 `FILE_ICON_GLYPHS` 里加一个函数，并在样式中写 `glyph: 'myGlyph'`。

匹配顺序：精确文件名 → 正则规则 → 点文件配置 → 后缀 → 默认文件图标。

## 实现方式

### Host 半（`index.js`）

注册两个只读接口：

```text
GET /read-doc/api/list?path=<绝对目录>
GET /read-doc/api/read?path=<绝对文件>
```

- 只接受回环调用和同源请求。
- 所有路径通过 `ctx.fs.resolve` 规范化。
- 解析后的目标必须位于 `ctx.workspaceRegistry.list()` 返回的某个工作区目录内，否则返回 `403`。
- 目录接口只返回直接子项；文件接口返回最多 4 MiB 的 UTF-8 文本。
- 没有写入、重命名、删除接口。

### Client 半（`client.js`）

- 注册右侧栏标签类型、正文和标题。
- 注册输入框工具栏入口。
- 在文档预览头部注册行引用操作。
- 注册一个带 codec 的自定义 `@` 引用来源，使引用 chip 能在提交时序列化。
- 安装文档级 `dragover` / `drop` 捕获监听，处理文件行拖放。

## 目录结构

| 文件 | 说明 |
| --- | --- |
| `index.js` | Host 路由、工作区限制、目录列表、文本读取 |
| `client.js` | 右侧栏标签、文件树、拖放、预览行引用、文件图标 |
| `FILE-ICONS.md` | 文件图标扩展模板 |
| `locale/en.json`、`locale/zh.json` | 插件管理器中的名称和描述 |
| `icon.svg` | 插件图标 |
| `cordis.patch.yml` | Bundle 行 |
| `package.json` | Bundle 清单和 DSH Client 声明 |

## 已知限制

- 当前工作区需要有会话；没有会话的工作区无法使用内置预览。
- 文件渲染完全由 DSH 内置文档预览提供，本插件不另造编辑器。
- 行号引用对代码和纯文本最准确；Markdown 为尽力匹配；PDF/Office 的文本选择不会产生行号引用。
- 文本读取上限 4 MiB；二进制或非法 UTF-8 文件不会以文本返回。
- 单个目录超过 10,000 个直接子项时会截断并显示提示。
- 文件树不会监听文件系统变化，需要手动刷新。
- 不提供写入、重命名、删除、上传或新建文件。

## 排查

| 现象 | 检查 |
| --- | --- |
| 没有文件夹按钮 | 刷新页面；确认 **Plugins** 中 bundle 已启用；确认 DSH 版本包含所需 UI 包。 |
| 提示“没有匹配的工作区文件夹” | 确认当前会话有 `cwd`，且属于已注册工作区；必要时在该工作区新建会话。 |
| 打开文件提示 no session / 没有会话 | 先在该工作区启动一个会话；预览需要会话授权读取。 |
| 提示 no serializer | 升级到当前版本；旧版本缺少引用 codec。 |
| 点击引用 chip 没有跳到行 | 当前预览渲染器可能没有行锚点，或引用后文件已变化。 |
| 文件列表读取失败 | 确认文件在已注册工作区内，且 DSH Host 有读取权限。 |

## 发布到 GitHub

仓库已经初始化。发布命令：

```bash
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<your-account>/dsh-read-doc.git
git push -u origin main
```

把 `<your-account>` 替换成你的 GitHub 用户名。

## 许可证

当前仓库还没有声明许可证。如果准备让其他人复用，请在发布前添加 `LICENSE` 文件。
