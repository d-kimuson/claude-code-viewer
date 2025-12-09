import { parseJsonl } from "../../claude-code/functions/parseJsonl";
import { calculateTokenCost, type TokenUsage } from "./calculateSessionCost";

/**
 * Aggregates token usage and cost from multiple file contents.
 *
 * This function processes conversation logs from one or more files (main session + agent sessions),
 * extracts token usage from assistant messages, and calculates the total cost across all files.
 *
 * @param fileContents - Array of JSONL file contents to process
 * @returns Aggregated token usage, total cost, and the last model name used
 *
 * @example
 * ```typescript
 * const result = aggregateTokenUsageAndCost([
 *   mainSessionContent,
 *   agentSession1Content,
 *   agentSession2Content
 * ]);
 *
 * console.log(result.totalCost.totalUsd); // Total cost across all sessions
 * console.log(result.totalUsage.input_tokens); // Total input tokens
 * ```
 */
export const aggregateTokenUsageAndCost = (
  fileContents: string[],
): {
  totalUsage: TokenUsage;
  totalCost: ReturnType<typeof calculateTokenCost>;
  modelName: string;
} => {
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCacheCreationTokens = 0;
  let totalCacheReadTokens = 0;
  let totalInputTokensUsd = 0;
  let totalOutputTokensUsd = 0;
  let totalCacheCreationUsd = 0;
  let totalCacheReadUsd = 0;
  let lastModelName = "claude-3.5-sonnet"; // Default model

  // Process each file content
  for (const content of fileContents) {
    const conversations = parseJsonl(content);

    for (const conversation of conversations) {
      if (conversation.type === "assistant") {
        const usage = conversation.message.usage;
        const modelName = conversation.message.model;

        // Calculate cost for this specific message
        const messageCost = calculateTokenCost(
          {
            input_tokens: usage.input_tokens,
            output_tokens: usage.output_tokens,
            cache_creation_input_tokens: usage.cache_creation_input_tokens ?? 0,
            cache_read_input_tokens: usage.cache_read_input_tokens ?? 0,
          },
          modelName,
        );

        // Accumulate token counts
        totalInputTokens += usage.input_tokens;
        totalOutputTokens += usage.output_tokens;
        totalCacheCreationTokens += usage.cache_creation_input_tokens ?? 0;
        totalCacheReadTokens += usage.cache_read_input_tokens ?? 0;

        // Accumulate costs
        totalInputTokensUsd += messageCost.breakdown.inputTokensUsd;
        totalOutputTokensUsd += messageCost.breakdown.outputTokensUsd;
        totalCacheCreationUsd += messageCost.breakdown.cacheCreationUsd;
        totalCacheReadUsd += messageCost.breakdown.cacheReadUsd;

        // Track the latest model name
        lastModelName = modelName;
      }
    }
  }

  const totalCost: ReturnType<typeof calculateTokenCost> = {
    totalUsd:
      totalInputTokensUsd +
      totalOutputTokensUsd +
      totalCacheCreationUsd +
      totalCacheReadUsd,
    breakdown: {
      inputTokensUsd: totalInputTokensUsd,
      outputTokensUsd: totalOutputTokensUsd,
      cacheCreationUsd: totalCacheCreationUsd,
      cacheReadUsd: totalCacheReadUsd,
    },
    tokenUsage: {
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      cacheCreationTokens: totalCacheCreationTokens,
      cacheReadTokens: totalCacheReadTokens,
    },
  };

  const aggregatedUsage: TokenUsage = {
    input_tokens: totalInputTokens,
    output_tokens: totalOutputTokens,
    cache_creation_input_tokens: totalCacheCreationTokens,
    cache_read_input_tokens: totalCacheReadTokens,
  };

  return {
    totalUsage: aggregatedUsage,
    totalCost,
    modelName: lastModelName,
  };
};
