import { z } from "zod";

/**
 * Schema for detecting rate limit messages from Claude Code session JSONL.
 *
 * This is a focused validation schema that only checks the required fields
 * for rate limit detection. It is intentionally less strict than the full
 * AssistantEntrySchema to avoid breaking when Claude Code adds new fields.
 */
export const RateLimitEntrySchema = z.object({
  type: z.literal("assistant"),
  error: z.literal("rate_limit"),
  isApiErrorMessage: z.literal(true),
  sessionId: z.string(),
  message: z.object({
    content: z.array(
      z.object({
        type: z.literal("text"),
        text: z.string(),
      }),
    ),
  }),
});

export type RateLimitEntry = z.infer<typeof RateLimitEntrySchema>;

/**
 * Result of rate limit detection.
 */
export type RateLimitDetectionResult =
  | {
      detected: true;
      sessionId: string;
      resetTimeText: string;
    }
  | {
      detected: false;
    };
