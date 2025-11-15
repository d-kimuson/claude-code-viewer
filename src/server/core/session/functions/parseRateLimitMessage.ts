import type { AssistantEntry } from "@/lib/conversation-schema/entry/AssistantEntrySchema";

/**
 * Type for rate limit message detection
 */
type RateLimitCheckable = {
  type: "assistant";
  isApiErrorMessage?: boolean;
  message: {
    content: AssistantEntry["message"]["content"];
  };
};

/**
 * Extracts the reset time from a rate limit error message.
 *
 * @param entry - The assistant entry to check
 * @returns The reset time string (e.g., "7pm", "5am") if found, null otherwise
 *
 * @example
 * const entry = {
 *   type: "assistant",
 *   isApiErrorMessage: true,
 *   message: {
 *     content: [{ type: "text", text: "Session limit reached ∙ resets 7pm" }]
 *   }
 * };
 * parseRateLimitMessage(entry); // Returns "7pm"
 */
export const parseRateLimitMessage = (
  entry: RateLimitCheckable,
): string | null => {
  // Check if this is an API error message
  if (!entry.isApiErrorMessage) {
    return null;
  }

  // Extract text content from message
  const content = entry.message.content;
  if (typeof content === "string") {
    return extractResetTime(content);
  }

  // Handle array content
  for (const item of content) {
    if (typeof item === "string") {
      const resetTime = extractResetTime(item);
      if (resetTime) return resetTime;
    } else if (item.type === "text") {
      const resetTime = extractResetTime(item.text);
      if (resetTime) return resetTime;
    }
  }

  return null;
};

/**
 * Extracts reset time from a text string.
 *
 * @param text - The text to search for reset time
 * @returns The reset time string if found, null otherwise
 */
const extractResetTime = (text: string): string | null => {
  // Match pattern: "Session limit reached ∙ resets {time}"
  // Time format: "7pm", "5am", etc.
  const match = /Session limit reached\s*∙\s*resets\s+(\d{1,2}(?:am|pm))/i.exec(
    text,
  );
  if (!match || match[1] === undefined) {
    return null;
  }

  return match[1];
};

/**
 * Parses a time string in the format "7pm" or "5am" into hour and minute.
 *
 * @param timeStr - Time string (e.g., "7pm", "5am", "12am", "12pm")
 * @returns Object with hour (0-23) and minute (0), or null if invalid
 *
 * @example
 * parseResetTime("7pm");  // Returns { hour: 19, minute: 0 }
 * parseResetTime("5am");  // Returns { hour: 5, minute: 0 }
 * parseResetTime("12am"); // Returns { hour: 0, minute: 0 }
 * parseResetTime("12pm"); // Returns { hour: 12, minute: 0 }
 */
export const parseResetTime = (
  timeStr: string,
): { hour: number; minute: number } | null => {
  const match = /^(\d{1,2})(am|pm)$/i.exec(timeStr);
  if (!match || match[1] === undefined || match[2] === undefined) {
    return null;
  }

  const hour = Number.parseInt(match[1], 10);
  const period = match[2].toLowerCase();

  // Validate hour range
  if (hour < 1 || hour > 12) {
    return null;
  }

  // Convert to 24-hour format
  let hour24: number;
  if (period === "am") {
    // 12am = 0:00, 1am = 1:00, ..., 11am = 11:00
    hour24 = hour === 12 ? 0 : hour;
  } else {
    // 12pm = 12:00, 1pm = 13:00, ..., 11pm = 23:00
    hour24 = hour === 12 ? 12 : hour + 12;
  }

  return { hour: hour24, minute: 0 };
};

/**
 * Calculates the ISO datetime string for when to resume the session.
 * The resume time is set to 1 minute after the reset time.
 * If the reset time has already passed today, it schedules for tomorrow.
 *
 * @param resetTimeStr - Reset time string (e.g., "7pm")
 * @param now - Current date/time (defaults to current time)
 * @returns ISO datetime string for resume time, or null if parsing fails
 *
 * @example
 * // Current time: 2025-11-15 10:00:00 UTC
 * calculateResumeDateTime("7pm"); // Returns "2025-11-15T19:01:00.000Z"
 *
 * // Current time: 2025-11-15 20:00:00 UTC (after 7pm)
 * calculateResumeDateTime("7pm"); // Returns "2025-11-16T19:01:00.000Z" (next day)
 */
export const calculateResumeDateTime = (
  resetTimeStr: string,
  now: Date = new Date(),
): string | null => {
  const parsed = parseResetTime(resetTimeStr);
  if (!parsed) {
    return null;
  }

  // Create a date object for the reset time today
  const resetDate = new Date(now);
  resetDate.setUTCHours(parsed.hour, parsed.minute, 0, 0);

  // If reset time has already passed, use tomorrow
  if (resetDate <= now) {
    resetDate.setUTCDate(resetDate.getUTCDate() + 1);
  }

  // Add 1 minute for resume time
  const resumeDate = new Date(resetDate);
  resumeDate.setUTCMinutes(resumeDate.getUTCMinutes() + 1);

  return resumeDate.toISOString();
};
