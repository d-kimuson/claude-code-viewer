import type { SessionMeta } from "../../types";

/**
 * Creates a mock SessionMeta object for testing purposes with default cost values
 */
export function createMockSessionMeta(
  overrides: Partial<SessionMeta> = {},
): SessionMeta {
  return {
    messageCount: 0,
    firstUserMessage: null,
    cost: {
      totalUsd: 0,
      breakdown: {
        inputTokensUsd: 0,
        outputTokensUsd: 0,
        cacheCreationUsd: 0,
        cacheReadUsd: 0,
      },
      tokenUsage: {
        inputTokens: 0,
        outputTokens: 0,
        cacheCreationTokens: 0,
        cacheReadTokens: 0,
      },
    },
    ...overrides,
  };
}
