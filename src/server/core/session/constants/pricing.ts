/**
 * Anthropic Claude API Pricing Information
 * Last updated: 2025-11-13
 *
 * Prices are in USD per million tokens (MTok)
 * Source: https://www.anthropic.com/pricing
 */

export type ModelName =
  | "claude-3.5-sonnet"
  | "claude-3-opus"
  | "claude-3-haiku"
  | "claude-instant-1.2"
  | "claude-2";

export type TokenType = "input" | "output" | "cache_creation" | "cache_read";

export type ModelPricing = {
  readonly input: number;
  readonly output: number;
  readonly cache_creation: number;
  readonly cache_read: number;
};

/**
 * Pricing per million tokens (MTok) in USD
 */
export const MODEL_PRICING: Record<ModelName, ModelPricing> = {
  "claude-3.5-sonnet": {
    input: 3.0,
    output: 15.0,
    cache_creation: 3.75,
    cache_read: 0.3,
  },
  "claude-3-opus": {
    input: 15.0,
    output: 75.0,
    cache_creation: 18.75,
    cache_read: 1.5,
  },
  "claude-3-haiku": {
    input: 0.25,
    output: 1.25,
    cache_creation: 0.3,
    cache_read: 0.03,
  },
  "claude-instant-1.2": {
    input: 1.63,
    output: 5.51,
    cache_creation: 2.0375, // 1.63 * 1.25
    cache_read: 0.163, // 1.63 * 0.1
  },
  "claude-2": {
    input: 8.0,
    output: 24.0,
    cache_creation: 10.0, // 8.0 * 1.25
    cache_read: 0.8, // 8.0 * 0.1
  },
} as const;

/**
 * Default pricing for unknown models
 * Uses Claude 3.5 Sonnet pricing as a safe default
 */
export const DEFAULT_MODEL_PRICING: ModelPricing =
  MODEL_PRICING["claude-3.5-sonnet"];
