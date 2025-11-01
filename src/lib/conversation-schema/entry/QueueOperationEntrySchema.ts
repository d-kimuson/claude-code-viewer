import { z } from "zod";

export const QueueOperationEntrySchema = z.union([
  z.object({
    type: z.literal("queue-operation"),
    operation: z.literal("enqueue"),
    content: z.string(),
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
