import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/api": {
        target: process.env.VITE_API_PROXY_TARGET ?? "http://localhost:8000",
        changeOrigin: true,
      },
      // Evidence files (screenshots/HTML) are served by Django itself under
      // MEDIA_URL — same backend, needs the same proxy as /api.
      "/media": {
        target: process.env.VITE_API_PROXY_TARGET ?? "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
