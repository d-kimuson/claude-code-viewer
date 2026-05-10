import { z } from "zod";

export const AiTitleEntrySchema = z.object({
  type: z.literal("ai-title"),
  aiTitle: z.string(),
  sessionId: z.string(),
});

export type AiTitleEntry = z.infer<typeof AiTitleEntrySchema>;
