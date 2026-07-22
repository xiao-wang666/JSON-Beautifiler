import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { viteSingleFile } from "vite-plugin-singlefile";

// 构建目标由环境变量 BUILD_TARGET 决定：
//   - extension : 打包进 Chrome 扩展（chrome-extension/app），相对路径 + 禁用 PWA。
//   - singlefile: 把 JS/CSS 全部内联进单个 index.html，可直接用 file:// 双击打开，
//                 无需任何服务器（用于本地桌面快捷打开程序）。
//   - 其余(默认): 普通 Web/PWA 构建与开发。
const buildTarget = process.env.BUILD_TARGET;
const isExtension = buildTarget === "extension";
const isSingleFile = buildTarget === "singlefile";

// 扩展页面与 file:// 单文件都需要相对资源路径；两者都不需要 Service Worker。
const useRelativeBase = isExtension || isSingleFile;
const disablePWA = isExtension || isSingleFile;

// https://vitejs.dev/config/
export default defineConfig({
  base: useRelativeBase ? "./" : "/",
  build: {
    // 关闭内联 modulepreload polyfill：扩展页面 MV3 CSP 禁止内联脚本；
    // 单文件模式也无需它。
    modulePreload: useRelativeBase ? { polyfill: false } : undefined,
  },
  plugins: [
    react(),
    // 单文件模式：把所有产物内联到一个 HTML 里。
    ...(isSingleFile ? [viteSingleFile()] : []),
    VitePWA({
      // 扩展 / 单文件构建里禁用 PWA：不生成 sw.js、不注入注册脚本；
      // 虚拟模块 virtual:pwa-register 仍会解析为 no-op，保证 main.tsx 正常打包。
      disable: disablePWA,
      registerType: "autoUpdate",
      manifest: false, // We already have public/manifest.webmanifest
      injectRegister: disablePWA ? false : "auto",
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,ico,webmanifest}"],
      },
    }),
  ],
});
