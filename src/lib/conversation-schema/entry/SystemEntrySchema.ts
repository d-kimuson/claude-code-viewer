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

// Turn duration entry (Claude Code v2.1.12+)
const TurnDurationEntrySchema = BaseEntrySchema.extend({
  type: z.literal("system"),
  subtype: z.literal("turn_duration"),
  durationMs: z.number(),
});

export const SystemEntrySchema = z.union([
  StopHookSummaryEntrySchema,
  LocalCommandEntrySchema,
  TurnDurationEntrySchema,
  SystemEntryWithContentSchema,
]);

export type SystemEntry = z.infer<typeof SystemEntrySchema>;
