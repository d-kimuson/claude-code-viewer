import { z } from "zod";
import { UserMessageSchema } from "../message/UserMessageSchema.ts";
import { BaseEntrySchema } from "./BaseEntrySchema.ts";

export const UserEntrySchema = BaseEntrySchema.extend({
  // discriminator
  type: z.literal("user"),

  // required
  message: UserMessageSchema,
});

export type UserEntry = z.infer<typeof UserEntrySchema>;
