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

test("parseRateLimitMessage should parse real session log data from 6bfc24e3-8911-4063-b4a1-236e49d13a6f", () => {
  // This is the actual entry from line 960 of the real session log
  const realRateLimitEntry = {
    parentUuid: "038f6b1d-d121-49ba-a327-60aed960d92e",
    isSidechain: false,
    userType: "external" as const,
    cwd: "/home/kaito/repos/claude-code-viewer",
    sessionId: "6bfc24e3-8911-4063-b4a1-236e49d13a6f",
    version: "2.0.24",
    gitBranch: "feature/6423aa72-strict-process-management",
    type: "assistant" as const,
    uuid: "ac93493b-80c8-41bc-a6b8-856dcccbdc69",
    timestamp: "2025-11-09T07:55:43.888Z",
    message: {
      id: "2adab99b-e90b-4991-bf0a-1f017d51d738",
      container: null,
      model: "<synthetic>" as const,
      role: "assistant" as const,
      stop_reason: "stop_sequence" as const,
      stop_sequence: "",
      type: "message" as const,
      usage: {
        input_tokens: 0,
        output_tokens: 0,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
        server_tool_use: {
          web_search_requests: 0,
        },
        service_tier: null,
        cache_creation: {
          ephemeral_1h_input_tokens: 0,
          ephemeral_5m_input_tokens: 0,
        },
      },
      content: [
        {
          type: "text" as const,
          text: "Session limit reached ∙ resets 7pm",
        },
      ],
    },
    isApiErrorMessage: true,
  };

  // Should correctly parse the rate limit message
  const resetTime = parseRateLimitMessage(realRateLimitEntry);
  expect(resetTime).toBe("7pm");

  // Should correctly parse the reset time
  const parsedTime = parseResetTime("7pm");
  expect(parsedTime).toEqual({ hour: 19, minute: 0 });

  // Should correctly calculate resume time (1 minute after reset)
  // Entry timestamp: 2025-11-09T07:55:43.888Z (7:55 AM UTC)
  // Reset time: 7pm (19:00) -> Same day
  // Resume time: 7:01pm (19:01)
  const entryTime = new Date("2025-11-09T07:55:43.888Z");
  const resumeTime = calculateResumeDateTime("7pm", entryTime);

  expect(resumeTime).toBeDefined();
  if (resumeTime) {
    const resumeDate = new Date(resumeTime);
    expect(resumeDate.getUTCFullYear()).toBe(2025);
    expect(resumeDate.getUTCMonth()).toBe(10); // November (0-indexed)
    expect(resumeDate.getUTCDate()).toBe(9);
    expect(resumeDate.getUTCHours()).toBe(19);
    expect(resumeDate.getUTCMinutes()).toBe(1);
  }
});
