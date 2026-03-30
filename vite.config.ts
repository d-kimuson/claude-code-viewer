import { fileURLToPath, URL } from "node:url";
import { lingui } from "@lingui/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import viteReact from "@vitejs/plugin-react-swc";
import dotenv from "dotenv";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

dotenv.config({ path: ".env.local" });

export default defineConfig({
  plugins: [
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
    }),
    viteReact(),
    lingui(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "icon-*.png"],
      manifest: {
        name: "Claude Code Viewer",
        short_name: "CCV",
        theme_color: "#0a0a0a",
        background_color: "#0a0a0a",
        display: "standalone",
        icons: [
          {
            src: "icon-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "icon-maskable-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "icon-maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
        runtimeCaching: [
          {
            // SSE must never be cached
            urlPattern: /\/api\/sse/,
            handler: "NetworkOnly",
          },
          {
            urlPattern: /^.*\/api\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60,
              },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    outDir: "dist/static",
  },
  server: {
    port: parseInt(process.env.DEV_FE_PORT ?? "3400", 10),
    proxy: {
      "/api": `http://localhost:${process.env.DEV_BE_PORT ?? "3401"}`,
      "/ws": {
        target: `http://localhost:${process.env.DEV_BE_PORT ?? "3401"}`,
        ws: true,
      },
    },
  },
});
