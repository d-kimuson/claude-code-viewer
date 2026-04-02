import { z } from "zod";
import { DocumentContentSchema } from "../content/DocumentContentSchema.ts";
import { ImageContentSchema } from "../content/ImageContentSchema.ts";
import { TextContentSchema } from "../content/TextContentSchema.ts";
import { ToolResultContentSchema } from "../content/ToolResultContentSchema.ts";

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
    content: z
      .union([z.string(), z.array(z.union([z.string(), QueueOperationContentSchema]))])
      .optional(),
    sessionId: z.string(),
    timestamp: z.iso.datetime(),
  }),
  z.object({
    type: z.literal("queue-operation"),
    operation: z.literal("dequeue"),
    sessionId: z.string(),
    timestamp: z.iso.datetime(),
  }),
  z.object({
    type: z.literal("queue-operation"),
    operation: z.literal("remove"),
    sessionId: z.string(),
    timestamp: z.iso.datetime(),
  }),
  z.object({
    type: z.literal("queue-operation"),
    operation: z.literal("popAll"),
    sessionId: z.string(),
    timestamp: z.iso.datetime(),
    content: z.string().optional(),
  }),
]);

export type QueueOperationEntry = z.infer<typeof QueueOperationEntrySchema>;
