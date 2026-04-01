import { z } from "zod";
import { parsedUserMessageSchema } from "../claude-code/functions/parseUserMessage.ts";

export const sessionMetaSchema = z.object({
  messageCount: z.number(),
  firstUserMessage: parsedUserMessageSchema.nullable(),
  customTitle: z.string().nullable(),
  cost: z.object({
    totalUsd: z.number(),
    breakdown: z.object({
      inputTokensUsd: z.number(),
      outputTokensUsd: z.number(),
      cacheCreationUsd: z.number(),
      cacheReadUsd: z.number(),
    }),
    tokenUsage: z.object({
      inputTokens: z.number(),
      outputTokens: z.number(),
      cacheCreationTokens: z.number(),
      cacheReadTokens: z.number(),
    }),
  }),
  modelName: z.string().nullable(),
  prLinks: z.array(
    z.object({
      prNumber: z.number(),
      prUrl: z.string(),
      prRepository: z.string(),
    }),
  ),
});
