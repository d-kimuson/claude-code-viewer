import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const config = defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    globals: true,
    setupFiles: ["src/testing/setup/vitest.setup.ts"],
    env: {
      ENVIRONMENT: "local",
    },
  },
});

export default config;
