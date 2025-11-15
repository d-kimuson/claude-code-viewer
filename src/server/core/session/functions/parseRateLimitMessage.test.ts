import { expect, test } from "vitest";
import {
  calculateResumeDateTime,
  parseRateLimitMessage,
  parseResetTime,
} from "./parseRateLimitMessage";

test("parseRateLimitMessage should return null for non-error messages", () => {
  const entry = {
    type: "assistant" as const,
    message: {
      content: [{ type: "text" as const, text: "Hello" }],
    },
  };

  const result = parseRateLimitMessage(entry);
  expect(result).toBeNull();
});

test("parseRateLimitMessage should return null when isApiErrorMessage is false", () => {
  const entry = {
    type: "assistant" as const,
    isApiErrorMessage: false,
    message: {
      content: [
        { type: "text" as const, text: "Session limit reached ∙ resets 7pm" },
      ],
    },
  };

  const result = parseRateLimitMessage(entry);
  expect(result).toBeNull();
});

test("parseRateLimitMessage should return null for non-rate-limit error messages", () => {
  const entry = {
    type: "assistant" as const,
    isApiErrorMessage: true,
    message: {
      content: [{ type: "text" as const, text: "Some other error message" }],
    },
  };

  const result = parseRateLimitMessage(entry);
  expect(result).toBeNull();
});

test("parseRateLimitMessage should extract reset time from rate limit message", () => {
  const entry = {
    type: "assistant" as const,
    isApiErrorMessage: true,
    message: {
      content: [
        { type: "text" as const, text: "Session limit reached ∙ resets 7pm" },
      ],
    },
  };

  const result = parseRateLimitMessage(entry);
  expect(result).toBe("7pm");
});

test("parseRateLimitMessage should handle different time formats", () => {
  const testCases = [
    { text: "Session limit reached ∙ resets 5am", expected: "5am" },
    { text: "Session limit reached ∙ resets 4pm", expected: "4pm" },
    { text: "Session limit reached ∙ resets 11pm", expected: "11pm" },
    { text: "Session limit reached ∙ resets 12am", expected: "12am" },
  ];

  for (const { text, expected } of testCases) {
    const entry = {
      type: "assistant" as const,
      isApiErrorMessage: true,
      message: {
        content: [{ type: "text" as const, text }],
      },
    };

    const result = parseRateLimitMessage(entry);
    expect(result).toBe(expected);
  }
});

test("parseResetTime should parse time format correctly", () => {
  expect(parseResetTime("7pm")).toEqual({ hour: 19, minute: 0 });
  expect(parseResetTime("5am")).toEqual({ hour: 5, minute: 0 });
  expect(parseResetTime("12am")).toEqual({ hour: 0, minute: 0 });
  expect(parseResetTime("12pm")).toEqual({ hour: 12, minute: 0 });
  expect(parseResetTime("11pm")).toEqual({ hour: 23, minute: 0 });
});

test("parseResetTime should return null for invalid format", () => {
  expect(parseResetTime("invalid")).toBeNull();
  expect(parseResetTime("25pm")).toBeNull();
  expect(parseResetTime("13am")).toBeNull();
  expect(parseResetTime("")).toBeNull();
});

test("calculateResumeDateTime should calculate future time on same day", () => {
  // Current time: 2025-11-15 10:00:00
  const now = new Date("2025-11-15T10:00:00Z");
  // Reset time: 7pm (19:00) -> Resume time: 7:01pm (19:01)
  const result = calculateResumeDateTime("7pm", now);

  expect(result).toBeDefined();
  if (result) {
    const resultDate = new Date(result);
    expect(resultDate.getUTCFullYear()).toBe(2025);
    expect(resultDate.getUTCMonth()).toBe(10); // November (0-indexed)
    expect(resultDate.getUTCDate()).toBe(15);
    expect(resultDate.getUTCHours()).toBe(19);
    expect(resultDate.getUTCMinutes()).toBe(1);
  }
});

test("calculateResumeDateTime should calculate time on next day when reset time has passed", () => {
  // Current time: 2025-11-15 20:00:00 (8pm)
  const now = new Date("2025-11-15T20:00:00Z");
  // Reset time: 7pm (19:00) has passed -> Next day 7:01pm
  const result = calculateResumeDateTime("7pm", now);

  expect(result).toBeDefined();
  if (result) {
    const resultDate = new Date(result);
    expect(resultDate.getUTCFullYear()).toBe(2025);
    expect(resultDate.getUTCMonth()).toBe(10); // November
    expect(resultDate.getUTCDate()).toBe(16); // Next day
    expect(resultDate.getUTCHours()).toBe(19);
    expect(resultDate.getUTCMinutes()).toBe(1);
  }
});

test("calculateResumeDateTime should handle midnight correctly", () => {
  // Current time: 2025-11-15 23:00:00
  const now = new Date("2025-11-15T23:00:00Z");
  // Reset time: 12am (midnight) -> Next day 00:01
  const result = calculateResumeDateTime("12am", now);

  expect(result).toBeDefined();
  if (result) {
    const resultDate = new Date(result);
    expect(resultDate.getUTCFullYear()).toBe(2025);
    expect(resultDate.getUTCMonth()).toBe(10); // November
    expect(resultDate.getUTCDate()).toBe(16); // Next day
    expect(resultDate.getUTCHours()).toBe(0);
    expect(resultDate.getUTCMinutes()).toBe(1);
  }
});

test("calculateResumeDateTime should return null for invalid time format", () => {
  const now = new Date("2025-11-15T10:00:00Z");
  expect(calculateResumeDateTime("invalid", now)).toBeNull();
  expect(calculateResumeDateTime("25pm", now)).toBeNull();
});
