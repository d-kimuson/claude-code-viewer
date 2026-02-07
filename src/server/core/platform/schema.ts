import { z } from "zod";

export const envSchema = z.object({
  // Frameworks
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .optional()
    .default("development"),
  NEXT_PHASE: z.string().optional(),
  PATH: z.string().optional(),
  SHELL: z.string().optional(),
  CCV_TERMINAL_SHELL: z.string().optional(),
  CCV_TERMINAL_CWD: z.string().optional(),
  CCV_TERMINAL_UNRESTRICTED: z.string().optional(),
});

export type EnvSchema = z.infer<typeof envSchema>;
