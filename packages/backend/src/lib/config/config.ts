import { localeSchema } from "@claude-code-viewer/shared/i18n/schema";
import z from "zod";

export const userConfigSchema = z.object({
  hideNoUserMessageSession: z.boolean().optional().default(true),
  unifySameTitleSession: z.boolean().optional().default(true),
  enterKeyBehavior: z
    .enum(["shift-enter-send", "enter-send", "command-enter-send"])
    .optional()
    .default("shift-enter-send"),
  permissionMode: z
    .enum(["acceptEdits", "bypassPermissions", "default", "plan"])
    .optional()
    .default("default"),
  locale: localeSchema.optional().default("en"),
});

export type UserConfig = z.infer<typeof userConfigSchema>;
