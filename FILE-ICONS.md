# 文件图标模板 / File icon template

插件里的文件图标是**数据驱动**的：后缀、文件名、匹配规则分别映射到一个图标键，图标键再决定 SVG 的外观。不需要给每个后缀写一个 React 组件。

代码位置：[client.js](client.js) 中的 `FILE_ICON_STYLES`、`FILE_ICON_GLYPHS`、`FILE_ICON_BY_EXTENSION`、`FILE_ICON_BY_NAME`、`FILE_ICON_PATTERNS`。

## 1. 增加一个“文字徽标”图标

适合 `FOO`、`BAR` 这类没有专用图形的文件：

```js
// 1) 后缀映射
FILE_ICON_BY_EXTENSION.foo = 'foo'
FILE_ICON_BY_EXTENSION.foobar = 'foo'

// 2) 图标外观
FILE_ICON_STYLES.foo = {
  label: 'FOO',   // 1-4 个字符最好
  bg: '#0F766E',  // 徽标底色
  fg: '#FFFFFF',  // 文字颜色
  fontSize: 4.8,  // 可选；不填会按字符数自动缩放
  mono: false,    // 可选；true 使用等宽字体
}
```

## 2. 精确匹配文件名

```js
FILE_ICON_BY_NAME['foo.config'] = 'foo'
FILE_ICON_BY_NAME['package.json'] = 'npm'
```

键名会自动转小写，所以大小写不敏感。

## 3. 正则匹配

适合 `README.*`、`Dockerfile.*`、`*.config.ts` 这类文件名：

```js
FILE_ICON_PATTERNS.unshift([/^foo(?:\..*)?$/i, 'foo'])
```

`unshift` 放在前面可以优先匹配；`push` 放在末尾。

## 4. 增加一个图形图标

需要画图形时，在 `FILE_ICON_GLYPHS` 里加一个返回 SVG 子节点的函数：

```js
FILE_ICON_GLYPHS.foo = (fg) => [
  h('path', {
    key: 'shape',
    d: 'M5 5h14v14H5z',
    fill: 'none',
    stroke: fg,
    strokeWidth: 1.7,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  }),
]

FILE_ICON_STYLES.foo = {
  glyph: 'foo',
  bg: '#334155',
  fg: '#FFFFFF',
}
```

## 5. 匹配顺序

1. `FILE_ICON_BY_NAME` 精确文件名
2. `FILE_ICON_PATTERNS` 正则规则
3. 点文件（如 `.npmrc`）→ `config`
4. `FILE_ICON_BY_EXTENSION` 后缀
5. `file` 默认图标

所以 `foo.d.ts` 会先命中 `*.d.ts` 规则，而不是普通 `.ts`；`README.zh-CN.md` 也会命中 README 规则。

## 已内置的常用类型

| 类别 | 后缀 / 文件名 |
|---|---|
| 前端 | `js` `mjs` `cjs` `jsx` `ts` `tsx` `html` `css` `scss` `sass` `less` `vue` `svelte` `astro` |
| 数据/配置 | `json` `jsonc` `yaml` `yml` `toml` `xml` `ini` `env` `.env*` `*.config.*` |
| 后端 | `py` `rs` `go` `java` `kt` `kts` `c` `h` `cpp` `hpp` `cs` `php` `rb` `swift` `lua` `dart` `r` `scala` `ex` `exs` `hs` `clj` `jl` `pl` `sol` `zig` |
| 文档 | `md` `mdx` `txt` `log` `pdf` `doc` `docx` `odt` `rtf` |
| 表格/演示 | `xls` `xlsx` `csv` `tsv` `ods` `ppt` `pptx` `odp` |
| 图片 | `png` `jpg` `jpeg` `gif` `webp` `bmp` `ico` `tif` `tiff` `avif` `svg` |
| 音视频 | `mp3` `wav` `flac` `ogg` `m4a` `aac` `mp4` `mov` `webm` `mkv` `avi` |
| 压缩/二进制 | `zip` `rar` `7z` `tar` `gz` `bz2` `xz` `jar` `apk` `exe` `dll` `so` `wasm` `class` |
| 其他 | `sql` `db` `sqlite` `woff` `woff2` `ttf` `otf` `lock` `pem` `key` |

特殊文件名：`package.json`、`pnpm-lock.yaml`、`yarn.lock`、`Dockerfile*`、`docker-compose.yml`、`.gitignore`、`README*`、`LICENSE*`、`Makefile`、`CMakeLists.txt`、`Cargo.toml`、`go.mod`、`Gemfile`、`composer.json`、`pubspec.yaml`、`Podfile` 等。
