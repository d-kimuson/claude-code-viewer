import { z } from "zod";
import { BaseEntrySchema } from "./BaseEntrySchema.ts";

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

// Away summary entry (Claude Code v2.1.112+ surfaces a recap when the user returns)
const AwaySummaryEntrySchema = BaseEntrySchema.extend({
  type: z.literal("system"),
  subtype: z.literal("away_summary"),
  content: z.string(),
});

// Informational entry (occasional CLI-side notices, e.g. unknown skill args)
const InformationalEntrySchema = BaseEntrySchema.extend({
  type: z.literal("system"),
  subtype: z.literal("informational"),
  content: z.string(),
  // Free-form: the CLI keeps adding severities (2.1.267 writes "notice") and
  // the value is only ever displayed.
  level: z.string().optional(),
});

// Bridge status entry (Claude Code v2.1.156+ remote-control sessions).
// Surfaced when /remote-control is active; carries a status message and the
// claude.ai continuation URL.
const BridgeStatusEntrySchema = BaseEntrySchema.extend({
  type: z.literal("system"),
  subtype: z.literal("bridge_status"),
  content: z.string(),
  url: z.string().optional(),
  level: z.enum(["info", "warning", "error"]).optional(),
});

// API error entry (tracks API errors and retries).
// Field shapes vary across providers: Anthropic uses {type, message},
// while some third-party gateways (e.g. Chinese rate-limit responses) use {code, message}.
// Keep this lenient — surfacing the entry beats a hard schema reject.
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
        type: z.string().optional(),
        code: z.string().optional(),
        error: z
          .object({
            type: z.string().optional(),
            code: z.string().optional(),
            message: z.string().optional(),
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

// Subtypes modelled above. The unknown-subtype fallback refuses these, so a
// malformed entry of a modelled subtype still fails validation.
export const KNOWN_SYSTEM_SUBTYPES = new Set<string>([
  "stop_hook_summary",
  "local_command",
  "turn_duration",
  "compact_boundary",
  "api_error",
  "away_summary",
  "informational",
  "bridge_status",
]);

// Catch-all for system subtypes the viewer does not model yet
// (`scheduled_task_fire`, `model_refusal_fallback`, ... — Claude Code keeps
// adding them). Base fields are still required; `content` and `level` are
// what the UI renders for a generic system entry. The subtype is normalised
// to the literal "unknown-subtype" (original kept in `originalSubtype`) so
// that `subtype === "..."` narrowing on the modelled members stays exact.
const UnknownSubtypeSystemEntrySchema = BaseEntrySchema.extend({
  type: z.literal("system"),
  subtype: z.string().refine((subtype) => !KNOWN_SYSTEM_SUBTYPES.has(subtype), {
    message: "known system subtypes must match their own schema",
  }),
  content: z.string().optional(),
  level: z.string().optional(),
}).transform(({ subtype, ...entry }) => ({
  ...entry,
  subtype: "unknown-subtype" as const,
  originalSubtype: subtype,
}));

export const SystemEntrySchema = z.union([
  StopHookSummaryEntrySchema,
  LocalCommandEntrySchema,
  TurnDurationEntrySchema,
  CompactBoundaryEntrySchema,
  ApiErrorEntrySchema,
  AwaySummaryEntrySchema,
  InformationalEntrySchema,
  BridgeStatusEntrySchema,
  UnknownSubtypeSystemEntrySchema, // any subtype not modelled above
  SystemEntryWithContentSchema, // Must be last (catch-all for undefined subtype)
]);

export type SystemEntry = z.infer<typeof SystemEntrySchema>;
