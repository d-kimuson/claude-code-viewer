import { z } from "zod";

export const AgentNameEntrySchema = z.object({
  type: z.literal("agent-name"),
  agentName: z.string(),
  sessionId: z.string(),
});

export type AgentNameEntry = z.infer<typeof AgentNameEntrySchema>;
