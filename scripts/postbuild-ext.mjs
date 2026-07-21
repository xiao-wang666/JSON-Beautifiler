/**
 * build:ext 的收尾脚本：把图标从 public/icons 拷到 chrome-extension/icons，
 * 供 manifest.json 引用（与打包进 app/ 的产物解耦，扩展根目录始终有图标）。
 */
import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = resolve(root, "public/icons");
const destDir = resolve(root, "chrome-extension/icons");

const icons = ["icon-192.png", "icon-512.png", "icon-512-maskable.png"];

await mkdir(destDir, { recursive: true });
for (const name of icons) {
  await copyFile(resolve(srcDir, name), resolve(destDir, name));
}

console.log(
  `[build:ext] 已拷贝 ${icons.length} 个图标 -> chrome-extension/icons`,
);
