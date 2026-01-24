import z from "zod";
import { localeSchema } from "../../../lib/i18n/schema";

export const userConfigSchema = z.object({
  hideNoUserMessageSession: z.boolean().optional().default(true),
  unifySameTitleSession: z.boolean().optional().default(false),
  enterKeyBehavior: z
    .enum(["shift-enter-send", "enter-send", "command-enter-send"])
    .optional()
    .default("shift-enter-send"),
  permissionMode: z
    .enum(["acceptEdits", "bypassPermissions", "default", "plan"])
    .optional()
    .default("default"),
  locale: localeSchema.optional().default("en"),
  theme: z.enum(["light", "dark", "system"]).optional().default("system"),
  searchHotkey: z.enum(["ctrl-k", "command-k"]).optional().default("command-k"),
  autoScheduleContinueOnRateLimit: z.boolean().optional().default(false),
});

export const defaultUserConfig = userConfigSchema.parse({});

export type UserConfig = z.infer<typeof userConfigSchema>;
