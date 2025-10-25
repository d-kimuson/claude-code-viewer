import { z } from "zod";

export const FileHistorySnapshotEntrySchema = z.object({
  // discriminator
  type: z.literal("file-history-snapshot"),

  // required
  messageId: z.string(),
  snapshot: z.object({
    messageId: z.string(),
    trackedFileBackups: z.record(z.string(), z.unknown()),
    timestamp: z.string(),
  }),
  isSnapshotUpdate: z.boolean(),
});

export type FileHistorySnapshotEntry = z.infer<
  typeof FileHistorySnapshotEntrySchema
>;
