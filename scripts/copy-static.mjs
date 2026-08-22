import { cpSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// vite build 之后，把运行时按 URL 直接请求（fetch）的静态文件同步进 dist/，
// 保持与 GitHub Pages 完全一致的路径。
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.dirname(scriptDir); // 项目根（scripts/ 的上一级）
const dist = path.join(root, "dist");

if (!existsSync(dist)) {
  console.error("dist/ 不存在，请先运行 vite build");
  process.exit(1);
}

// 运行时数据：broadcast/data/**（sites.json、notice.md）
cpSync(path.join(root, "broadcast", "data"), path.join(dist, "broadcast", "data"), {
  recursive: true,
});

// 完整镜像图片资源，保证所有历史资源 URL 与 GitHub Pages 一致
// （其中两张 hero 图同时被 Vite 打包进 dist/assets，双份无害）
cpSync(path.join(root, "broadcast", "assets"), path.join(dist, "broadcast", "assets"), {
  recursive: true,
});

// GitHub Pages 兼容标记（对 Freebuff 托管无害）
copyNoJekyll();

function copyNoJekyll() {
  const src = path.join(root, ".nojekyll");
  if (existsSync(src)) {
    cpSync(src, path.join(dist, ".nojekyll"));
  }
}

console.log("Copied broadcast/data and .nojekyll into dist/");
