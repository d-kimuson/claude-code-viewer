import { z } from "zod";

export const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .optional()
    .default("development"),
  GLOBAL_CLAUDE_DIR: z.string().optional(),
  NEXT_PHASE: z.string().optional(),
  PORT: z
    .string()
    .optional()
    .default("3000")
    .transform((val) => parseInt(val, 10)),
  PATH: z.string().optional(),
  CLAUDE_CODE_VIEWER_CC_EXECUTABLE_PATH: z.string().optional(),
  CLAUDE_CODE_VIEWER_AUTH_PASSWORD: z.string().optional(),
});

export type EnvSchema = z.infer<typeof envSchema>;
