import { z } from "zod";

export const PrLinkEntrySchema = z.object({
  type: z.literal("pr-link"),
  sessionId: z.string(),
  prNumber: z.number(),
  prUrl: z.string(),
  prRepository: z.string(),
  timestamp: z.iso.datetime(),
});

export type PrLinkEntry = z.infer<typeof PrLinkEntrySchema>;
