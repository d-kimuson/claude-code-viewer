import { z } from "zod";
import { UserMessageSchema } from "../message/UserMessageSchema";
import { BaseEntrySchema } from "./BaseEntrySchema";

export const UserEntrySchema = BaseEntrySchema.extend({
  // discriminator
  type: z.literal("user"),

  // required
  message: UserMessageSchema,
});
