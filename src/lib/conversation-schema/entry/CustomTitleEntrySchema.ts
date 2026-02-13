import { z } from "zod";

export const CustomTitleEntrySchema = z.object({
  type: z.literal("custom-title"),
  customTitle: z.string(),
  sessionId: z.string(),
});

export type CustomTitleEntry = z.infer<typeof CustomTitleEntrySchema>;
