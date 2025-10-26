import { z } from "zod";

/**
 * Schema for image block parameter
 */
const imageBlockSchema = z.object({
  type: z.literal("image"),
  source: z.object({
    type: z.literal("base64"),
    media_type: z.enum(["image/png", "image/jpeg", "image/gif", "image/webp"]),
    data: z.string(),
  }),
});

/**
 * Schema for document block parameter
 */
const documentBlockSchema = z.object({
  type: z.literal("document"),
  source: z.object({
    type: z.literal("base64"),
    media_type: z.enum(["application/pdf"]),
    data: z.string(),
  }),
});

/**
 * Schema for user message input with optional images and documents
 */
export const userMessageInputSchema = z.object({
  text: z.string().min(1),
  images: z.array(imageBlockSchema).optional(),
  documents: z.array(documentBlockSchema).optional(),
});

export type UserMessageInputSchema = z.infer<typeof userMessageInputSchema>;
