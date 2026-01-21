import { z } from "zod";
import { BaseEntrySchema } from "./BaseEntrySchema";

// Hook info for stop_hook_summary
const HookInfoSchema = z.object({
  command: z.string(),
});

// Base system entry with content (original format)
const SystemEntryWithContentSchema = BaseEntrySchema.extend({
  type: z.literal("system"),
  content: z.string(),
  toolUseID: z.string(),
  level: z.enum(["info"]),
  subtype: z.undefined().optional(),
});

// Stop hook summary entry (new format from Claude Code v2.0.76+)
const StopHookSummaryEntrySchema = BaseEntrySchema.extend({
  type: z.literal("system"),
  subtype: z.literal("stop_hook_summary"),
  toolUseID: z.string(),
  level: z.enum(["info", "suggestion"]),
  slug: z.string().optional(),
  hookCount: z.number(),
  hookInfos: z.array(HookInfoSchema),
  hookErrors: z.array(z.unknown()),
  preventedContinuation: z.boolean(),
  stopReason: z.string(),
  hasOutput: z.boolean(),
});

// Local command entry (e.g., /mcp, /help commands)
const LocalCommandEntrySchema = BaseEntrySchema.extend({
  type: z.literal("system"),
  subtype: z.literal("local_command"),
  content: z.string(),
  level: z.enum(["info"]),
});

// Turn duration entry (tracks duration of assistant turns, Claude Code v2.1+)
const TurnDurationEntrySchema = BaseEntrySchema.extend({
  type: z.literal("system"),
  subtype: z.literal("turn_duration"),
  durationMs: z.number(),
  slug: z.string().optional(),
});

// Compact boundary entry (new format from Claude Code)
const CompactBoundaryEntrySchema = BaseEntrySchema.extend({
  type: z.literal("system"),
  subtype: z.literal("compact_boundary"),
  content: z.string(),
  level: z.enum(["info"]),
  slug: z.string().optional(),
  logicalParentUuid: z.string().optional(),
  compactMetadata: z
    .object({
      trigger: z.string(),
      preTokens: z.number(),
    })
    .optional(),
});

// API error entry (tracks API errors and retries)
const ApiErrorEntrySchema = BaseEntrySchema.extend({
  type: z.literal("system"),
  subtype: z.literal("api_error"),
  level: z.enum(["error", "warning", "info"]),
  error: z.object({
    status: z.number().optional(),
    headers: z.record(z.string(), z.unknown()).optional(),
    requestID: z.string().nullable().optional(),
    error: z
      .object({
        type: z.string(),
        error: z
          .object({
            type: z.string(),
            message: z.string(),
          })
          .optional(),
        message: z.string().optional(),
      })
      .optional(),
  }),
  retryInMs: z.number().optional(),
  retryAttempt: z.number().optional(),
  maxRetries: z.number().optional(),
});

export const SystemEntrySchema = z.union([
  StopHookSummaryEntrySchema,
  LocalCommandEntrySchema,
  TurnDurationEntrySchema,
  CompactBoundaryEntrySchema,
  ApiErrorEntrySchema,
  SystemEntryWithContentSchema, // Must be last (catch-all for undefined subtype)
]);

export type SystemEntry = z.infer<typeof SystemEntrySchema>;
