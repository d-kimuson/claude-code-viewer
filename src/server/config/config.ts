import z from "zod";

export const configSchema = z.object({
  hideNoUserMessageSession: z.boolean().optional().default(true),
  unifySameTitleSession: z.boolean().optional().default(true),
  expandThinking: z.boolean().optional().default(false),
  expandToolUse: z.boolean().optional().default(false),
  expandToolResult: z.boolean().optional().default(false),
  expandSystemMessage: z.boolean().optional().default(false),
  expandMetaInformation: z.boolean().optional().default(false),
  expandSummary: z.boolean().optional().default(false),
});

export type Config = z.infer<typeof configSchema>;
