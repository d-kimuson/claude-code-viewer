import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseRateLimitResetTime } from "./parseRateLimitResetTime";

describe("parseRateLimitResetTime", () => {
  beforeEach(() => {
    // Mock current date to 2026-01-24 10:00:00 UTC
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-24T10:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("successful parsing", () => {
    it("parses time with Asia/Tokyo timezone in 12-hour format (PM)", () => {
      const text = "You've hit your limit · resets 8pm (Asia/Tokyo)";

      const result = parseRateLimitResetTime(text);

      // 8pm in Asia/Tokyo is 11:00 UTC (JST = UTC+9), +1 minute adjustment
      expect(result).toBe("2026-01-24T11:01:00.000Z");
    });

    it("parses time with Asia/Tokyo timezone in 12-hour format (AM)", () => {
      const text = "You've hit your limit · resets 3am (Asia/Tokyo)";

      const result = parseRateLimitResetTime(text);

      // Current: 10:00 UTC (19:00 JST)
      // Target: 3am JST = 18:00 UTC, +1 minute adjustment
      // Since 18:00 UTC > 10:00 UTC, it should be today
      expect(result).toBe("2026-01-24T18:01:00.000Z");
    });

    it("parses time with colon format (3:00 AM)", () => {
      const text = "You've hit your limit · resets 3:00 AM (Asia/Tokyo)";

      const result = parseRateLimitResetTime(text);

      // Current: 10:00 UTC (19:00 JST)
      // Target: 3:00 AM JST = 18:00 UTC, +1 minute adjustment
      // Since 18:00 UTC > 10:00 UTC, it should be today
      expect(result).toBe("2026-01-24T18:01:00.000Z");
    });

    it("parses time with minutes (8:30pm)", () => {
      const text = "You've hit your limit · resets 8:30pm (Asia/Tokyo)";

      const result = parseRateLimitResetTime(text);

      // 8:30pm in Asia/Tokyo is 11:30 UTC, +1 minute adjustment
      expect(result).toBe("2026-01-24T11:31:00.000Z");
    });

    it("parses 12pm (noon) correctly", () => {
      const text = "You've hit your limit · resets 12pm (Asia/Tokyo)";

      const result = parseRateLimitResetTime(text);

      // Current: 10:00 UTC (19:00 JST)
      // Target: 12pm (noon) JST = 03:00 UTC, +1 minute adjustment
      // Since 03:00 UTC < 10:00 UTC, it should be next day
      expect(result).toBe("2026-01-25T03:01:00.000Z");
    });

    it("parses 12am (midnight) correctly", () => {
      const text = "You've hit your limit · resets 12am (Asia/Tokyo)";

      const result = parseRateLimitResetTime(text);

      // Current: 10:00 UTC (19:00 JST)
      // Target: 12am (midnight) JST = 15:00 UTC, +1 minute adjustment
      // Since 15:00 UTC > 10:00 UTC, it should be today
      expect(result).toBe("2026-01-24T15:01:00.000Z");
    });

    it("parses time with UTC timezone", () => {
      const text = "You've hit your limit · resets 3:00 PM (UTC)";

      const result = parseRateLimitResetTime(text);

      // +1 minute adjustment
      expect(result).toBe("2026-01-24T15:01:00.000Z");
    });

    it("parses time with America/New_York timezone", () => {
      const text = "You've hit your limit · resets 5pm (America/New_York)";

      const result = parseRateLimitResetTime(text);

      // 5pm EST is 22:00 UTC (EST = UTC-5), +1 minute adjustment
      expect(result).toBe("2026-01-24T22:01:00.000Z");
    });

    it("parses time with Europe/London timezone", () => {
      const text = "You've hit your limit · resets 3pm (Europe/London)";

      const result = parseRateLimitResetTime(text);

      // 3pm GMT is 15:00 UTC in winter, +1 minute adjustment
      expect(result).toBe("2026-01-24T15:01:00.000Z");
    });

    it("handles next day rollover when reset time is earlier than current time", () => {
      // Current time is 10:00 UTC (19:00 JST)
      // Reset at 9am JST (00:00 UTC) should be next day
      const text = "You've hit your limit · resets 9am (Asia/Tokyo)";

      const result = parseRateLimitResetTime(text);

      // 9am JST = 00:00 UTC, but since 00:00 UTC < 10:00 UTC (current), it should be next day
      // +1 minute adjustment
      expect(result).toBe("2026-01-25T00:01:00.000Z");
    });
  });

  describe("fallback to 30 minutes from now", () => {
    it("returns fallback for text without reset time pattern", () => {
      const text = "Some unrelated error message";

      const result = parseRateLimitResetTime(text);

      // Should be 30 minutes from now
      expect(result).toBe("2026-01-24T10:30:00.000Z");
    });

    it("returns fallback for empty string", () => {
      const result = parseRateLimitResetTime("");

      expect(result).toBe("2026-01-24T10:30:00.000Z");
    });

    it("returns fallback for invalid time format", () => {
      const text = "You've hit your limit · resets tomorrow (Asia/Tokyo)";

      const result = parseRateLimitResetTime(text);

      expect(result).toBe("2026-01-24T10:30:00.000Z");
    });

    it("returns fallback for invalid timezone", () => {
      const text = "You've hit your limit · resets 8pm (Invalid/Timezone)";

      const result = parseRateLimitResetTime(text);

      expect(result).toBe("2026-01-24T10:30:00.000Z");
    });

    it("returns fallback when only time without timezone", () => {
      const text = "You've hit your limit · resets 8pm";

      const result = parseRateLimitResetTime(text);

      expect(result).toBe("2026-01-24T10:30:00.000Z");
    });
  });

  describe("edge cases", () => {
    it("handles extra whitespace in text", () => {
      const text = "You've hit your limit ·  resets  8pm  (Asia/Tokyo)";

      const result = parseRateLimitResetTime(text);

      // +1 minute adjustment
      expect(result).toBe("2026-01-24T11:01:00.000Z");
    });

    it("handles case variations in AM/PM", () => {
      const text1 = "You've hit your limit · resets 8PM (Asia/Tokyo)";
      const text2 = "You've hit your limit · resets 8Pm (Asia/Tokyo)";

      // +1 minute adjustment
      expect(parseRateLimitResetTime(text1)).toBe("2026-01-24T11:01:00.000Z");
      expect(parseRateLimitResetTime(text2)).toBe("2026-01-24T11:01:00.000Z");
    });

    it("handles lowercase am/pm", () => {
      const text = "You've hit your limit · resets 8pm (Asia/Tokyo)";

      const result = parseRateLimitResetTime(text);

      // +1 minute adjustment
      expect(result).toBe("2026-01-24T11:01:00.000Z");
    });

    it("handles uppercase AM/PM", () => {
      const text = "You've hit your limit · resets 8 PM (Asia/Tokyo)";

      const result = parseRateLimitResetTime(text);

      // +1 minute adjustment
      expect(result).toBe("2026-01-24T11:01:00.000Z");
    });
  });
});
