import { z } from "zod";

export const DocumentContentSchema = z.object({
  type: z.literal("document"),
  source: z.union([
    z.object({
      media_type: z.literal("text/plain"),
      type: z.literal("text"),
      data: z.string(),
    }),
    z.object({
      media_type: z.enum(["application/pdf"]),
      type: z.literal("base64"),
      data: z.string(),
    }),
  ]),
});
