import { z } from "zod";

export const AgentSettingEntrySchema = z.object({
  type: z.literal("agent-setting"),
  agentSetting: z.string(),
  sessionId: z.string(),
});

export type AgentSettingEntry = z.infer<typeof AgentSettingEntrySchema>;
