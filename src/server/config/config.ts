import z from "zod";

export const configSchema = z.object({
  hideNoUserMessageSession: z.boolean().optional().default(true),
  unifySameTitleSession: z.boolean().optional().default(true),
  enterKeyBehavior: z
    .enum(["shift-enter-send", "enter-send"])
    .optional()
    .default("shift-enter-send"),
});

export type Config = z.infer<typeof configSchema>;
