import z from "zod";

export const configSchema = z.object({
  hideNoUserMessageSession: z.boolean().optional().default(true),
  unifySameTitleSession: z.boolean().optional().default(true),
  enterKeyBehavior: z
    .enum(["shift-enter-send", "enter-send"])
    .optional()
    .default("shift-enter-send"),
  permissionMode: z
    .enum(["acceptEdits", "bypassPermissions", "default", "plan"])
    .optional()
    .default("default"),
});

export type Config = z.infer<typeof configSchema>;
