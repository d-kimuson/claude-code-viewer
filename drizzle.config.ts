import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/server/lib/db/schema.ts",
  out: "./src/server/lib/db/migrations",
  dialect: "sqlite",
});
