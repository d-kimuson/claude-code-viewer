import { defineConfig } from "vitest/config";

const config = defineConfig({
  test: {
    globals: true,
    setupFiles: ["src/testing/setup/vitest.setup.ts"],
    env: {
      ENVIRONMENT: "local",
    },
  },
});

export default config;
