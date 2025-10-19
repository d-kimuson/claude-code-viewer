import { z } from "zod";

export const SummaryEntrySchema = z.object({
  type: z.literal("summary"),
  summary: z.string(),
  leafUuid: z.string().uuid(),
});

export type SummaryEntry = z.infer<typeof SummaryEntrySchema>;
