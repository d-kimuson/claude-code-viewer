import { z } from "zod";
import { DocumentContentSchema } from "../content/DocumentContentSchema";
import { ImageContentSchema } from "../content/ImageContentSchema";
import { TextContentSchema } from "../content/TextContentSchema";
import { ToolResultContentSchema } from "../content/ToolResultContentSchema";

const UserMessageContentSchema = z.union([
  z.string(),
  TextContentSchema,
  ToolResultContentSchema,
  ImageContentSchema,
  DocumentContentSchema,
]);

export type UserMessageContent = z.infer<typeof UserMessageContentSchema>;

export const UserMessageSchema = z.object({
  role: z.literal("user"),
  content: z.union([
    z.string(),
    z.array(z.union([z.string(), UserMessageContentSchema])),
  ]),
});
