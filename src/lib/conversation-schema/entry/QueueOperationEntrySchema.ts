import { z } from "zod";
import { DocumentContentSchema } from "../content/DocumentContentSchema";
import { ImageContentSchema } from "../content/ImageContentSchema";
import { TextContentSchema } from "../content/TextContentSchema";
import { ToolResultContentSchema } from "../content/ToolResultContentSchema";

const QueueOperationContentSchema = z.union([
  z.string(),
  TextContentSchema,
  ToolResultContentSchema,
  ImageContentSchema,
  DocumentContentSchema,
]);

export const QueueOperationEntrySchema = z.union([
  z.object({
    type: z.literal("queue-operation"),
    operation: z.literal("enqueue"),
    content: z.union([
      z.string(),
      z.array(z.union([z.string(), QueueOperationContentSchema])),
    ]),
    sessionId: z.string(),
    timestamp: z.iso.datetime(),
  }),
  z.object({
    type: z.literal("queue-operation"),
    operation: z.literal("dequeue"),
    sessionId: z.string(),
    timestamp: z.iso.datetime(),
  }),
]);

export type QueueOperationEntry = z.infer<typeof QueueOperationEntrySchema>;
