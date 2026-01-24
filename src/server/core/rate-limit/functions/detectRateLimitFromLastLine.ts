import type { RateLimitDetectionResult } from "../schema";
import { RateLimitEntrySchema } from "../schema";

/**
 * Detects if a JSON line represents a rate limit error from Claude Code.
 *
 * This pure function parses a single JSON line string and determines if it
 * matches the rate limit entry pattern. If matched, it extracts the session
 * ID and reset time text.
 *
 * @param jsonLine - A single line of JSON from a Claude Code session JSONL file
 * @returns Detection result with session info if rate limit detected
 */
export const detectRateLimitFromLastLine = (
  jsonLine: string,
): RateLimitDetectionResult => {
  const trimmed = jsonLine.trim();
  if (trimmed === "") {
    return { detected: false };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { detected: false };
  }

  const validation = RateLimitEntrySchema.safeParse(parsed);
  if (!validation.success) {
    return { detected: false };
  }

  const entry = validation.data;
  const firstTextContent = entry.message.content[0];
  if (!firstTextContent) {
    return { detected: false };
  }

  return {
    detected: true,
    sessionId: entry.sessionId,
    resetTimeText: firstTextContent.text,
  };
};
