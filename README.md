# JSON Beautifier

一个纯前端 JSON 美化与可视化工具，支持解析、格式化、树状折叠视图、搜索定位、语法高亮、主题切换。可作为网页 / PWA 使用，也能打包成**本地桌面 App**（原生窗口、零服务器）或 **Chrome 扩展**。

## 快速开始

```bash
# 安装依赖
npm install

# 开发模式
npm run dev
# 浏览器打开 http://localhost:5173

# 生产构建
npm run build

# 预览构建产物
npx serve dist
# 浏览器打开 http://localhost:3000
```

## 本地桌面 App（无需服务器，双击即用）

因为本工具是纯前端应用，可以把整个构建产物内联成**单个自包含 HTML**，再套一层原生窗口，做成完全离线、无需任何服务器的桌面程序。

```bash
npm run build:app
```

产物在 `desktop-app/`：

- **`JSON Beautifier.app`** —— macOS 原生程序（Swift + WKWebView）。双击后是**真正的原生窗口**（独立窗口、无地址栏/标签栏），不依赖 Chrome、不起服务器。自包含 HTML 已内嵌进程序包，可整体拷贝/移动到任意位置（路径含空格/中文也没问题）。推荐用这个。
- **`JSON-Beautifier.html`** —— 完全自包含的单文件（JS/CSS/图标全部内联）。双击即用默认浏览器打开；可随意拷贝、发给别人、放 U 盘。

> 构建时如果检测不到 `swiftc`（Swift 编译器，随 Xcode Command Line Tools 提供），`.app` 会自动回退为“用默认浏览器打开内嵌 HTML”。

### 功能与快捷键

- **新建窗口（多开对比）**：工具栏「新建窗口」按钮、菜单栏 `文件 → 新建窗口`、快捷键 **⌘N** 或 **Ctrl+N**，都会开一个新的原生窗口。
- **标准编辑快捷键**：⌘C/⌘V/⌘X/⌘A/⌘Z、⌘W 关闭窗口、⌘Q 退出，均可用（原生菜单栏提供）。
- 网页里 JSON 值中的外部链接会用系统默认浏览器打开。

### 放到桌面 / 应用程序

把 `desktop-app/JSON Beautifier.app` 拖到桌面或「应用程序」即可。改了代码后重新 `npm run build:app`，再覆盖一次即可更新（若正开着，先 ⌘Q 退出再重开）。

> 早期版本桌面上的 `JSON Beautifier.app` 是 Chrome PWA，写死指向 `http://localhost:5173/`（开发服务器），不开服务器就打不开。现在这个原生 `.app` 自带内容、不依赖任何服务器，可直接替换它。

## Chrome 扩展（小组件）

扩展点击图标后，会以弹出窗口打开**扩展内置的打包版**（`chrome-extension/app`）。

不探测任何本地端口 —— 无论 3000 上是否跑着别的项目，点图标永远打开本扩展自带的 JSON Beautifier，不会串到其它项目。

### 构建与加载

```bash
# 1. 构建扩展（产物打包进 chrome-extension/app，并拷贝图标）
npm run build:ext

# 2. Chrome 打开 chrome://extensions
# 3. 打开右上角「开发者模式」
# 4. 点「加载已解压的扩展程序」，选择项目下的 chrome-extension 目录
# 5. 点击工具栏的 JSON Beautifier 图标即可
```

### 说明

- 改了源码想更新扩展内容 → 重新 `npm run build:ext`，再到 `chrome://extensions` 点「刷新」重载扩展。
- 只改了 `manifest.json` / `background.js`（扩展根目录源文件）→ 无需 `build:ext`，直接在 `chrome://extensions` 点「刷新」即可。
- `chrome-extension/app` 与 `chrome-extension/icons` 是构建产物，已加入 `.gitignore`；`manifest.json`、`background.js` 是源文件。

## PWA 安装（离线可用）

1. `npm run build`
2. `npx serve dist`
3. 用 Chrome/Edge 打开 `http://localhost:3000`
4. 点击地址栏右侧的 ⊕ 图标 → "安装"
5. 安装后可从 Launchpad/桌面图标启动，离线也能使用

---

## 更新与发布流程

### 日常开发

```bash
# 1. 修改代码
# 2. 本地验证
npm run dev          # 开发模式预览
npx tsc --noEmit    # 类型检查

# 3. 构建生产版本
npm run build

# 4. 预览构建产物
npx serve dist
```

### 更新 PWA（已安装用户如何获取新版本）

PWA 使用 `autoUpdate` 策略，用户下次打开时 Service Worker 会自动检查更新：

1. 修改代码后执行 `npm run build`
2. 将 `dist/` 部署到服务器（或重新 `npx serve dist`）
3. 用户下次打开应用时，Service Worker 自动下载新的 precache 清单
4. 新版本在后台安装完毕后自动激活（页面刷新即生效）

> 本地开发时：停掉旧的 serve → 重新 build → 重新 serve → 打开应用等几秒即更新

### 更新图标

```bash
# 修改 public/favicon.svg 后：
node -e "
const sharp = require('sharp');
const fs = require('fs');
const svg = fs.readFileSync('public/favicon.svg');
(async () => {
  await sharp(svg).resize(192, 192).png().toFile('public/icons/icon-192.png');
  await sharp(svg).resize(512, 512).png().toFile('public/icons/icon-512.png');
  // maskable 版本需要额外处理安全区域
  console.log('Done');
})();
"
npm run build
```

### 部署到远程服务器

```bash
npm run build
# 将 dist/ 目录上传到任何静态托管服务：
# - Vercel: vercel deploy dist
# - Netlify: 拖拽 dist/ 到 Netlify 面板
# - GitHub Pages: 将 dist/ 推送到 gh-pages 分支
# - 自建 Nginx: 将 dist/ 复制到 /var/www/html
```

### 版本管理建议

```bash
# 修改版本号
npm version patch   # 0.0.1 → 0.0.2
npm version minor   # 0.0.2 → 0.1.0
npm version major   # 0.1.0 → 1.0.0

# 提交
git add .
git commit -m "feat: 描述改动"
git push
```

## 技术栈

- React 18 + TypeScript
- Vite (构建)
- Ant Design 5 (UI 组件)
- vite-plugin-pwa (PWA/离线)
- vite-plugin-singlefile (单文件构建，用于桌面 App)
- Swift + WKWebView (macOS 原生桌面壳)
- 自研容错 JSON 解析器（支持 JS 对象字面量）
- CSS 变量驱动主题系统

## 构建产物一览

| 命令                | 产物                | 用途                                      |
| ------------------- | ------------------- | ----------------------------------------- |
| `npm run build`     | `dist/`             | Web 站点 / PWA                            |
| `npm run build:app` | `desktop-app/`      | 本地桌面 App（原生 `.app` + 自包含 HTML） |
| `npm run build:ext` | `chrome-extension/` | Chrome 扩展                               |

> `dist/`、`desktop-app/`、`chrome-extension/app`、`chrome-extension/icons` 均为构建产物，已加入 `.gitignore`。

## 目录结构

```
src/
  core/        # 纯函数内核（解析、序列化、扁平化、搜索、newWindow）
  state/       # 应用状态（useReducer + themeStore）
  components/  # React 组件
scripts/
  mac-app-main.swift   # 桌面 App 的原生窗口壳（WKWebView）
  postbuild-app.mjs    # build:app 收尾：生成自包含 HTML + 组装 .app + 图标
  postbuild-ext.mjs    # build:ext 收尾：拷贝扩展图标
chrome-extension/
  manifest.json        # 扩展清单（源文件）
  background.js        # 扩展后台脚本（源文件）
public/
  favicon.svg          # 浏览器 tab 图标
  manifest.webmanifest # PWA 清单
  icons/               # PWA 安装图标（192/512）
```
