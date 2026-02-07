import { fileURLToPath, URL } from "node:url";
import { lingui } from "@lingui/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import viteReact from "@vitejs/plugin-react-swc";
import dotenv from "dotenv";
import { defineConfig } from "vite";

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
