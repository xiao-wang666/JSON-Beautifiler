import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// 当以 `BUILD_TARGET=extension vite build` 方式构建时，产物会被打包进
// Chrome 扩展（chrome-extension/app）。扩展页面与普通 Web 站点有两点不同：
//   1. 资源需用相对路径（chrome-extension://<id>/app/ 下），故 base 用 "./"。
//   2. MV3 扩展页面禁止内联脚本，需关掉 modulepreload 的内联 polyfill；
//      同时 Service Worker/PWA 在扩展页面里无意义，直接禁用。
const isExtension = process.env.BUILD_TARGET === "extension";

// https://vitejs.dev/config/
export default defineConfig({
  base: isExtension ? "./" : "/",
  build: {
    // 关闭内联 modulepreload polyfill，避免 MV3 CSP 拦截内联 <script>。
    modulePreload: isExtension ? { polyfill: false } : undefined,
  },
  plugins: [
    react(),
    VitePWA({
      // 扩展构建里禁用 PWA：不生成 sw.js、不注入注册脚本；
      // 虚拟模块 virtual:pwa-register 仍会解析为 no-op，保证 main.tsx 正常打包。
      disable: isExtension,
      registerType: "autoUpdate",
      manifest: false, // We already have public/manifest.webmanifest
      injectRegister: isExtension ? false : "auto",
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,ico,webmanifest}"],
      },
    }),
  ],
});
