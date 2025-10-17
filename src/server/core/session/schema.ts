import { z } from "zod";
import { parsedCommandSchema } from "../claude-code/functions/parseCommandXml";

export const sessionMetaSchema = z.object({
  messageCount: z.number(),
  firstCommand: parsedCommandSchema.nullable(),
});
