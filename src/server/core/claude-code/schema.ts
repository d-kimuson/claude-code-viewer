import { z } from "zod";

export const mediaTypeSchema = z.enum([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
]);

export type MediaType = z.infer<typeof mediaTypeSchema>;

/**
 * Schema for image block parameter
 */
const imageBlockSchema = z.object({
  type: z.literal("image"),
  source: z.object({
    type: z.literal("base64"),
    media_type: mediaTypeSchema,
    data: z.string(),
  }),
});

export type ImageBlockParam = z.infer<typeof imageBlockSchema>;

/**
 * Schema for document block parameter
 */
const documentBlockSchema = z.object({
  type: z.literal("document"),
  source: z.union([
    z.object({
      type: z.literal("text"),
      media_type: z.enum(["text/plain"]),
      data: z.string(),
    }),
    z.object({
      type: z.literal("base64"),
      media_type: z.enum(["application/pdf"]),
      data: z.string(),
    }),
  ]),
});

export type DocumentBlockParam = z.infer<typeof documentBlockSchema>;

/**
 * Schema for user message input with optional images and documents
 */
export const userMessageInputSchema = z.object({
  text: z.string().min(1),
  images: z.array(imageBlockSchema).optional(),
  documents: z.array(documentBlockSchema).optional(),
});

export type UserMessageInputSchema = z.infer<typeof userMessageInputSchema>;
