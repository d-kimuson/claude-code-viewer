import { z } from "zod";

// "last-prompt" entries track the most recent prompt for a session.
// Older Claude Code versions emitted the prompt text via `lastPrompt`, while
// newer versions (v2.1.145+, remote-control/bridge sessions) instead point at
// the leaf message via `leafUuid`. Keep both optional for backward compatibility.
export const LastPromptEntrySchema = z.object({
  type: z.literal("last-prompt"),
  lastPrompt: z.string().optional(),
  leafUuid: z.string().optional(),
  sessionId: z.string(),
});

export type LastPromptEntry = z.infer<typeof LastPromptEntrySchema>;
