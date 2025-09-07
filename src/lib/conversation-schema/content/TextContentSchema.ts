import { z } from "zod";

export const TextContentSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
});
