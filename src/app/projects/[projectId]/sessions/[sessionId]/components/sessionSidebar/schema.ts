import { z } from "zod";

export const tabSchema = z.enum([
  "sessions",
  "mcp",
  "scheduler",
  "settings",
  "system-info",
  "tool-calls",
]);

export type Tab = z.infer<typeof tabSchema>;
