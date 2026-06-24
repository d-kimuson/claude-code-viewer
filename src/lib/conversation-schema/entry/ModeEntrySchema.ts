import { z } from "zod";

// "mode" entries record the active session mode (e.g. "normal").
// Emitted by Claude Code v2.1.152+ alongside remote-control/bridge sessions.
// Distinct from "permission-mode" entries, which carry a `permissionMode` field.
export const ModeEntrySchema = z.object({
  type: z.literal("mode"),
  mode: z.string(),
  sessionId: z.string(),
});

export type ModeEntry = z.infer<typeof ModeEntrySchema>;
