import { z } from "zod";
import { AssistantMessageSchema } from "../message/AssistantMessageSchema.ts";
import { BaseEntrySchema } from "./BaseEntrySchema.ts";

export const AssistantEntrySchema = BaseEntrySchema.extend({
  // discriminator
  type: z.literal("assistant"),

  // required
  message: AssistantMessageSchema,

  // optional
  requestId: z.string().optional(),
  isApiErrorMessage: z.boolean().optional(),
  usage: z
    .object({
      input_tokens: z.number(),
      output_tokens: z.number(),
    })
    .optional(),
});

export type AssistantEntry = z.infer<typeof AssistantEntrySchema>;
