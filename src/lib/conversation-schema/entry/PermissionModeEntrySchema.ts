import { z } from "zod";

export const PermissionModeEntrySchema = z.object({
  type: z.literal("permission-mode"),
  permissionMode: z.string(),
  sessionId: z.string(),
});

export type PermissionModeEntry = z.infer<typeof PermissionModeEntrySchema>;
