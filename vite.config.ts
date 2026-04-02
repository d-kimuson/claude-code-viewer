import { fileURLToPath, URL } from "node:url";
import { lingui } from "@lingui/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import viteReact from "@vitejs/plugin-react-swc";
import dotenv from "dotenv";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { getManualChunkName } from "./src/web/lib/build/chunking";

dotenv.config({ path: ".env.local" });

export default defineConfig({
  plugins: [
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
      routesDirectory: "./src/web/routes",
      generatedRouteTree: "./src/web/routeTree.gen.ts",
    }),
    viteReact(),
    lingui(),
    tailwindcss(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "icon-*.png"],
      manifest: {
        name: "Claude Code Viewer",
        short_name: "CCV",
        theme_color: "#0a0a0a",
        background_color: "#0a0a0a",
        display: "standalone",
        start_url: "/",
        scope: "/",
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
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
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
    chunkSizeWarningLimit: 700,
    rolldownOptions: {
      output: {
        manualChunks(moduleId) {
          return getManualChunkName(moduleId);
        },
      },
    },
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
