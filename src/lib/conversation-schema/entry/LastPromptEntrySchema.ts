import { z } from "zod";

export const LastPromptEntrySchema = z.object({
  type: z.literal("last-prompt"),
  lastPrompt: z.string(),
  sessionId: z.string(),
});

export type LastPromptEntry = z.infer<typeof LastPromptEntrySchema>;
