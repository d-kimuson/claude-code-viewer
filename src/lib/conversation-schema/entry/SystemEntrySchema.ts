import { z } from "zod";
import { BaseEntrySchema } from "./BaseEntrySchema";

export const ApiErrorSchema = z.object({
  status: z.number(),
  headers: z.record(z.string(), z.string()).default({}),
  requestID: z.string().nullable(),
  error: z.object({
    error: z.object({
      message: z.string(),
      type: z.string(),
      code: z.string(),
    }),
  }),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;

export const SystemEntrySchema = BaseEntrySchema.extend({
  // discriminator
  type: z.literal("system"),

  // required
  content: z.string(),
  toolUseID: z.string(),
  level: z.enum(["info", "error"]),

  // optional for error entries
  subtype: z
    .enum([
      "api_error",
      "timeout_error",
      "rate_limit_error",
      "authentication_error",
      "authorization_error",
      "validation_error",
      "internal_error",
      "provider_error",
    ])
    .optional(),
  error: ApiErrorSchema.optional(),
  retryInMs: z.number().optional(),
  retryAttempt: z.number().optional(),
  maxRetries: z.number().optional(),
});

export type SystemEntry = z.infer<typeof SystemEntrySchema>;
