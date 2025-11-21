/**
 * Normalizes a prompt string for cache key generation.
 *
 * This function:
 * - Trims leading and trailing whitespace
 * - Collapses multiple whitespace characters (spaces, tabs, newlines) into a single space
 * - Converts to lowercase for case-insensitive matching
 *
 * This ensures that prompts with minor whitespace differences map to the same cache key.
 *
 * @param prompt - The prompt string to normalize
 * @returns The normalized prompt string
 *
 * @example
 * normalizePrompt("  Run the test suite  ") // => "run the test suite"
 * normalizePrompt("Run\n\nthe test suite") // => "run the test suite"
 */
export const normalizePrompt = (prompt: string): string => {
  return prompt.trim().replace(/\s+/g, " ").toLowerCase();
};
