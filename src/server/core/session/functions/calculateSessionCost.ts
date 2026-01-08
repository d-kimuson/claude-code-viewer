import {
  DEFAULT_MODEL_PRICING,
  MODEL_PRICING,
  type ModelName,
  type ModelPricing,
} from "../constants/pricing";

/**
 * Token usage information extracted from assistant messages
 */
export type TokenUsage = {
  readonly input_tokens: number;
  readonly output_tokens: number;
  readonly cache_creation_input_tokens: number | undefined;
  readonly cache_read_input_tokens: number | undefined;
};

/**
 * Cost breakdown by token type in USD
 */
export type CostBreakdown = {
  readonly inputTokensUsd: number;
  readonly outputTokensUsd: number;
  readonly cacheCreationUsd: number;
  readonly cacheReadUsd: number;
};

/**
 * Token usage summary
 */
export type TokenUsageSummary = {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly cacheCreationTokens: number;
  readonly cacheReadTokens: number;
};

/**
 * Cost calculation result
 */
export type CostCalculationResult = {
  readonly totalUsd: number;
  readonly breakdown: CostBreakdown;
  readonly tokenUsage: TokenUsageSummary;
};

/**
 * Normalizes Claude API model names to standard model identifiers
 *
 * Examples:
 * - "claude-opus-4-5-20251101" -> "claude-opus-4.5"
 * - "claude-opus-4-1-20250101" -> "claude-opus-4.1"
 * - "claude-sonnet-4-5-20250929" -> "claude-sonnet-4.5"
 * - "claude-haiku-4-5-20251001" -> "claude-haiku-4.5"
 * - "claude-sonnet-4-20250514" -> "claude-3.5-sonnet"
 * - "claude-3-5-sonnet-20240620" -> "claude-3.5-sonnet"
 * - "claude-3-opus-20240229" -> "claude-3-opus"
 * - "claude-3-haiku-20240307" -> "claude-3-haiku"
 *
 * @param modelName Raw model name from API
 * @returns Normalized model name or default model name if unknown
 */
export function normalizeModelName(modelName: string): ModelName {
  const normalized = modelName.toLowerCase();

  // Claude Opus 4.5 patterns (more specific first)
  if (normalized.includes("opus-4-5") || normalized.includes("opus-4.5")) {
    return "claude-opus-4.5";
  }

  // Claude Opus 4.1 patterns
  if (normalized.includes("opus-4-1") || normalized.includes("opus-4.1")) {
    return "claude-opus-4.1";
  }

  // Claude Sonnet 4.5 patterns
  if (normalized.includes("sonnet-4-5") || normalized.includes("sonnet-4.5")) {
    return "claude-sonnet-4.5";
  }

  // Claude Haiku 4.5 patterns
  if (normalized.includes("haiku-4-5") || normalized.includes("haiku-4.5")) {
    return "claude-haiku-4.5";
  }

  // Claude 3.5 Sonnet patterns (Sonnet 4 without version suffix)
  if (
    normalized.includes("sonnet-4") ||
    normalized.includes("3-5-sonnet") ||
    normalized.includes("3.5-sonnet")
  ) {
    return "claude-3.5-sonnet";
  }

  // Claude 3 Opus patterns
  if (normalized.includes("3-opus") || normalized.includes("opus-20")) {
    return "claude-3-opus";
  }

  // Claude 3 Haiku patterns
  if (normalized.includes("3-haiku") || normalized.includes("haiku-20")) {
    return "claude-3-haiku";
  }

  // Unknown model - return default
  return "claude-3.5-sonnet";
}

/**
 * Gets pricing for a model, with fallback to default pricing
 */
function getModelPricing(modelName: string): ModelPricing {
  const normalized = normalizeModelName(modelName);
  return MODEL_PRICING[normalized] ?? DEFAULT_MODEL_PRICING;
}

/**
 * Calculates the cost in USD for token usage
 *
 * @param usage Token usage information
 * @param modelName Model name (will be normalized)
 * @returns Cost calculation result with breakdown
 */
export function calculateTokenCost(
  usage: TokenUsage,
  modelName: string,
): CostCalculationResult {
  const pricing = getModelPricing(modelName);

  // Convert tokens to millions for cost calculation
  const inputMTok = usage.input_tokens / 1_000_000;
  const outputMTok = usage.output_tokens / 1_000_000;
  const cacheCreationMTok =
    (usage.cache_creation_input_tokens ?? 0) / 1_000_000;
  const cacheReadMTok = (usage.cache_read_input_tokens ?? 0) / 1_000_000;

  // Calculate costs
  const inputTokensUsd = inputMTok * pricing.input;
  const outputTokensUsd = outputMTok * pricing.output;
  const cacheCreationUsd = cacheCreationMTok * pricing.cache_creation;
  const cacheReadUsd = cacheReadMTok * pricing.cache_read;

  const totalUsd =
    inputTokensUsd + outputTokensUsd + cacheCreationUsd + cacheReadUsd;

  return {
    totalUsd,
    breakdown: {
      inputTokensUsd,
      outputTokensUsd,
      cacheCreationUsd,
      cacheReadUsd,
    },
    tokenUsage: {
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
      cacheCreationTokens: usage.cache_creation_input_tokens ?? 0,
      cacheReadTokens: usage.cache_read_input_tokens ?? 0,
    },
  };
}
