import { z } from "zod";

export const ImageContentSchema = z.object({
  type: z.literal("image"),
  source: z.object({
    type: z.literal("base64"),
    data: z.string(),
    media_type: z.enum(["image/png", "image/jpeg", "image/gif", "image/webp"]),
  }),
});
