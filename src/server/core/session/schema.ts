import { z } from "zod";
import { parsedUserMessageSchema } from "../claude-code/functions/parseUserMessage";

export const sessionMetaSchema = z.object({
  messageCount: z.number(),
  firstUserMessage: parsedUserMessageSchema.nullable(),
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
});
