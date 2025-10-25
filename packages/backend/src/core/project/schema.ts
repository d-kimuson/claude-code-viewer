import { z } from "zod";

export const projectMetaSchema = z.object({
  projectName: z.string().nullable(),
  projectPath: z.string().nullable(),
  sessionCount: z.number(),
});
