import { z } from "zod";

export const AtisLatchEntrySchema = z.object({
  type: z.literal("atis-latch"),
  atis: z.string(),
  sessionId: z.string(),
});

export type AtisLatchEntry = z.infer<typeof AtisLatchEntrySchema>;
