import { z } from "zod";
import { BaseEntrySchema } from "./BaseEntrySchema";

export const SystemEntrySchema = BaseEntrySchema.extend({
  // discriminator
  type: z.literal("system"),

  // required
  content: z.string(),
  toolUseID: z.string(),
  level: z.enum(["info"]),
});
