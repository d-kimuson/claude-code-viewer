import { z } from "zod";

export const tabSchema = z.enum([
  "sessions",
  "mcp",
  "scheduler",
  "settings",
  "system-info",
]);

export type Tab = z.infer<typeof tabSchema>;
