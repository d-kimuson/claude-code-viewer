import { z } from "zod";
import { parsedUserMessageSchema } from "../claude-code/functions/parseUserMessage";

export const sessionMetaSchema = z.object({
  messageCount: z.number(),
  firstUserMessage: parsedUserMessageSchema.nullable(),
});
