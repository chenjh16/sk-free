import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 多页应用：根页（React 重定向入口）+ broadcast 页（原生 JS，保持不变）
export default defineConfig({
  plugins: [react()],
  publicDir: false,
  build: {
    rollupOptions: {
      input: {
        main: "index.html",
        broadcast: "broadcast/index.html",
      },
    },
  },
});
