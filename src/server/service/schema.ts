import { z } from "zod";
import { parsedCommandSchema } from "./parseCommandXml";

export const projectMetaSchema = z.object({
  projectName: z.string().nullable(),
  projectPath: z.string().nullable(),
  lastModifiedAt: z.string().nullable(),
  sessionCount: z.number(),
});

export const sessionMetaSchema = z.object({
  messageCount: z.number(),
  firstCommand: parsedCommandSchema.nullable(),
  lastModifiedAt: z.string().nullable(),
});
