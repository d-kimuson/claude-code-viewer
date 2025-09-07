import { z } from "zod";
import { AssistantMessageSchema } from "../message/AssistantMessageSchema";
import { BaseEntrySchema } from "./BaseEntrySchema";

export const AssistantEntrySchema = BaseEntrySchema.extend({
  // discriminator
  type: z.literal("assistant"),

  // required
  message: AssistantMessageSchema,

  // optional
  requestId: z.string().optional(),
  isApiErrorMessage: z.boolean().optional(),
});
