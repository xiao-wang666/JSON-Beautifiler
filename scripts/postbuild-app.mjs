/**
 * build:app 的收尾脚本。产出两样东西（都在 desktop-app/ 下，无需任何服务器）：
 *
 *   1. JSON-Beautifier.html —— 完全自包含的单文件（JS/CSS/图标全内联），
 *      直接双击即可用 file:// 在浏览器里打开。
 *   2. "JSON Beautifier.app" —— 一个把上面 HTML 内嵌进去的 macOS 程序包，
 *      双击后用 Chrome 的「应用窗口」模式（无地址栏/标签栏）打开，像原生 App。
 *      找不到 Chrome 时回退到默认浏览器。
 *
 * 处理 HTML 时：内联 favicon 为 data URI、删除 PWA manifest 链接，使其自包含。
 */
import {
  readFile,
  writeFile,
  rm,
  readdir,
  mkdir,
  chmod,
} from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = resolve(root, "desktop-app");

// ---- 1. 生成自包含 HTML ------------------------------------------------
let html = await readFile(resolve(outDir, "index.html"), "utf8");

try {
  const svg = await readFile(resolve(root, "public/favicon.svg"), "utf8");
  const dataUri = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  html = html.replace(/href="\.\/favicon\.svg"/g, `href="${dataUri}"`);
} catch {
  // 没有 favicon 也无妨
}
html = html.replace(/\s*<link rel="manifest"[^>]*>/g, "");

const HTML_NAME = "JSON-Beautifier.html";
await writeFile(resolve(outDir, HTML_NAME), html, "utf8");

// 清理其它构建产物，只保留最终 HTML（.app 稍后再建）
for (const entry of await readdir(outDir)) {
  if (entry !== HTML_NAME) {
    await rm(resolve(outDir, entry), { recursive: true, force: true });
  }
}

// ---- 2. 组装 macOS .app 程序包 ----------------------------------------
const APP_NAME = "JSON Beautifier.app";
const appDir = resolve(outDir, APP_NAME);
const macOsDir = resolve(appDir, "Contents/MacOS");
const resDir = resolve(appDir, "Contents/Resources");
await mkdir(macOsDir, { recursive: true });
await mkdir(resDir, { recursive: true });

// 把自包含 HTML 内嵌进程序包，使 .app 可整体移动/拷贝
await writeFile(resolve(resDir, HTML_NAME), html, "utf8");

// 优先编译原生 WKWebView 壳（真正的原生窗口，无浏览器痕迹、无服务器、无 Chrome
// 多实例问题）。若机器上没有 swiftc，则回退到「用默认浏览器打开」的 shell 脚本。
let executableName = "run";
let usedNative = false;
try {
  execFileSync("swiftc", ["--version"], { stdio: "ignore" });
  executableName = "JSONBeautifier";
  const swiftSrc = resolve(root, "scripts/mac-app-main.swift");
  execFileSync(
    "swiftc",
    [
      "-O",
      "-o",
      resolve(macOsDir, executableName),
      swiftSrc,
      "-framework",
      "Cocoa",
      "-framework",
      "WebKit",
    ],
    { stdio: "inherit" },
  );
  await chmod(resolve(macOsDir, executableName), 0o755);
  usedNative = true;
} catch {
  executableName = "run";
  usedNative = false;
}

const infoPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>JSON Beautifier</string>
  <key>CFBundleDisplayName</key><string>JSON Beautifier</string>
  <key>CFBundleExecutable</key><string>${executableName}</string>
  <key>CFBundleIconFile</key><string>app.icns</string>
  <key>CFBundleIdentifier</key><string>local.json-beautifier.desktop</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleVersion</key><string>1.0</string>
  <key>CFBundleShortVersionString</key><string>1.0</string>
  <key>LSMinimumSystemVersion</key><string>12.0</string>
  <key>NSHighResolutionCapable</key><true/>
</dict>
</plist>
`;
await writeFile(resolve(appDir, "Contents/Info.plist"), infoPlist, "utf8");

// 回退方案：无 swiftc 时用默认浏览器打开自包含 HTML（普通标签页，但一定能开）
if (!usedNative) {
  const runScript = `#!/bin/bash
# 无 swiftc 时的回退：用系统默认浏览器打开内嵌的自包含 HTML。
SRC="$(cd "$(dirname "$0")/../Resources" && pwd)/${HTML_NAME}"
DATA="$HOME/.json-beautifier"
mkdir -p "$DATA"
cp -f "$SRC" "$DATA/app.html"
exec open "$DATA/app.html"
`;
  const runPath = resolve(macOsDir, "run");
  await writeFile(runPath, runScript, "utf8");
  await chmod(runPath, 0o755);
}

// ---- 3. 生成应用图标 app.icns（用项目图标；失败则跳过，用系统默认图标）----
try {
  const srcPng = resolve(root, "public/icons/icon-512.png");
  const iconset = resolve(outDir, "icon.iconset");
  await mkdir(iconset, { recursive: true });
  // iconutil 要求固定命名的多尺寸集合
  const variants = [
    ["icon_16x16.png", 16],
    ["icon_16x16@2x.png", 32],
    ["icon_32x32.png", 32],
    ["icon_32x32@2x.png", 64],
    ["icon_128x128.png", 128],
    ["icon_128x128@2x.png", 256],
    ["icon_256x256.png", 256],
    ["icon_256x256@2x.png", 512],
    ["icon_512x512.png", 512],
    ["icon_512x512@2x.png", 1024],
  ];
  for (const [name, size] of variants) {
    execFileSync(
      "sips",
      [
        "-z",
        String(size),
        String(size),
        srcPng,
        "--out",
        resolve(iconset, name),
      ],
      { stdio: "ignore" },
    );
  }
  execFileSync(
    "iconutil",
    ["-c", "icns", iconset, "-o", resolve(resDir, "app.icns")],
    { stdio: "ignore" },
  );
  await rm(iconset, { recursive: true, force: true });
  console.log("[build:app] 已生成应用图标 app.icns");
} catch (err) {
  console.log(
    "[build:app] 跳过图标生成（sips/iconutil 不可用或图标缺失），将用系统默认图标",
  );
}

console.log(`[build:app] 生成完成：`);
console.log(`  - desktop-app/${HTML_NAME}   (双击用浏览器打开)`);
console.log(`  - desktop-app/${APP_NAME}    (双击像原生 App 打开)`);
