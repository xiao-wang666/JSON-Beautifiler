# JSON Beautifier

一个纯前端 JSON 美化与可视化工具，支持解析、格式化、树状折叠视图、搜索定位、语法高亮、主题切换，并可作为 PWA 安装到桌面离线使用。

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

## 桌面快捷启动

双击桌面的 `JSON-Beautifier.command` 即可自动启动开发服务器并打开浏览器。

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
- 自研容错 JSON 解析器（支持 JS 对象字面量）
- CSS 变量驱动主题系统

## 目录结构

```
src/
  core/        # 纯函数内核（解析、序列化、扁平化、搜索）
  state/       # 应用状态（useReducer + themeStore）
  components/  # React 组件
  pwa/         # PWA 相关（manifest 已在 public/）
public/
  favicon.svg          # 浏览器 tab 图标
  manifest.webmanifest # PWA 清单
  icons/               # PWA 安装图标（192/512）
```
