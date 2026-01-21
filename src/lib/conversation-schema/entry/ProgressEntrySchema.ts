import { z } from "zod";
import { BaseEntrySchema } from "./BaseEntrySchema";

export const ProgressEntrySchema = BaseEntrySchema.extend({
  // discriminator
  type: z.literal("progress"),

  // required
  data: z.record(z.string(), z.any()),
  toolUseID: z.string().optional(),
  parentToolUseID: z.string().optional(),
});

export type ProgressEntry = z.infer<typeof ProgressEntrySchema>;
