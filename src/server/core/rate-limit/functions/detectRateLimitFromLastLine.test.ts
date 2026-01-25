import { describe, expect, it } from "vitest";
import { detectRateLimitFromLastLine } from "./detectRateLimitFromLastLine";

describe("detectRateLimitFromLastLine", () => {
  describe("rate limit detection", () => {
    it("detects rate limit message and returns session info", () => {
      const jsonLine = JSON.stringify({
        parentUuid: "7a75ca65-bfe3-45f2-8107-5abb1c91e12e",
        isSidechain: false,
        userType: "external",
        cwd: "/home/user/repos/project",
        sessionId: "9112408c-3585-4a39-a13f-11045828d870",
        version: "2.1.0",
        gitBranch: "main",
        type: "assistant",
        uuid: "6fe0e12b-0160-4156-8c5f-66d1cd20944a",
        timestamp: "2026-01-24T09:54:19.597Z",
        message: {
          id: "38434a42-356d-496f-ba6b-fba39cb50b35",
          container: null,
          model: "<synthetic>",
          role: "assistant",
          stop_reason: "stop_sequence",
          stop_sequence: "",
          type: "message",
          usage: {
            input_tokens: 0,
            output_tokens: 0,
            cache_creation_input_tokens: 0,
            cache_read_input_tokens: 0,
          },
          content: [
            {
              type: "text",
              text: "You've hit your limit · resets 8pm (Asia/Tokyo)",
            },
          ],
        },
        error: "rate_limit",
        isApiErrorMessage: true,
      });

      const result = detectRateLimitFromLastLine(jsonLine);

      expect(result).toEqual({
        detected: true,
        sessionId: "9112408c-3585-4a39-a13f-11045828d870",
        resetTimeText: "You've hit your limit · resets 8pm (Asia/Tokyo)",
      });
    });

    it("detects rate limit with different reset time formats", () => {
      const jsonLine = JSON.stringify({
        type: "assistant",
        error: "rate_limit",
        isApiErrorMessage: true,
        sessionId: "abc123",
        message: {
          content: [
            {
              type: "text",
              text: "You've hit your limit · resets 3:00 AM (UTC)",
            },
          ],
        },
      });

      const result = detectRateLimitFromLastLine(jsonLine);

      expect(result).toEqual({
        detected: true,
        sessionId: "abc123",
        resetTimeText: "You've hit your limit · resets 3:00 AM (UTC)",
      });
    });
  });

  describe("non-rate-limit entries", () => {
    it("returns not detected for regular assistant message", () => {
      const jsonLine = JSON.stringify({
        type: "assistant",
        sessionId: "abc123",
        message: {
          id: "msg-1",
          type: "message",
          role: "assistant",
          model: "claude-3-5-sonnet",
          stop_reason: "end_turn",
          content: [{ type: "text", text: "Hello, how can I help?" }],
        },
      });

      const result = detectRateLimitFromLastLine(jsonLine);

      expect(result).toEqual({ detected: false });
    });

    it("returns not detected for user message", () => {
      const jsonLine = JSON.stringify({
        type: "user",
        sessionId: "abc123",
        message: { role: "user", content: "Hello" },
      });

      const result = detectRateLimitFromLastLine(jsonLine);

      expect(result).toEqual({ detected: false });
    });

    it("returns not detected for summary entry", () => {
      const jsonLine = JSON.stringify({
        type: "summary",
        summary: "This is a summary",
        leafUuid: "550e8400-e29b-41d4-a716-446655440003",
      });

      const result = detectRateLimitFromLastLine(jsonLine);

      expect(result).toEqual({ detected: false });
    });

    it("returns not detected for system entry", () => {
      const jsonLine = JSON.stringify({
        type: "system",
        sessionId: "abc123",
        subtype: "api_error",
        level: "error",
        error: { status: 500 },
      });

      const result = detectRateLimitFromLastLine(jsonLine);

      expect(result).toEqual({ detected: false });
    });

    it("returns not detected when error is not rate_limit", () => {
      const jsonLine = JSON.stringify({
        type: "assistant",
        error: "other_error",
        isApiErrorMessage: true,
        sessionId: "abc123",
        message: {
          content: [{ type: "text", text: "Some error occurred" }],
        },
      });

      const result = detectRateLimitFromLastLine(jsonLine);

      expect(result).toEqual({ detected: false });
    });

    it("returns not detected when isApiErrorMessage is false", () => {
      const jsonLine = JSON.stringify({
        type: "assistant",
        error: "rate_limit",
        isApiErrorMessage: false,
        sessionId: "abc123",
        message: {
          content: [{ type: "text", text: "Rate limit" }],
        },
      });

      const result = detectRateLimitFromLastLine(jsonLine);

      expect(result).toEqual({ detected: false });
    });

    it("returns not detected when isApiErrorMessage is missing", () => {
      const jsonLine = JSON.stringify({
        type: "assistant",
        error: "rate_limit",
        sessionId: "abc123",
        message: {
          content: [{ type: "text", text: "Rate limit" }],
        },
      });

      const result = detectRateLimitFromLastLine(jsonLine);

      expect(result).toEqual({ detected: false });
    });
  });

  describe("invalid input handling", () => {
    it("returns not detected for invalid JSON", () => {
      const invalidJson = "this is not valid json";

      const result = detectRateLimitFromLastLine(invalidJson);

      expect(result).toEqual({ detected: false });
    });

    it("returns not detected for empty string", () => {
      const result = detectRateLimitFromLastLine("");

      expect(result).toEqual({ detected: false });
    });

    it("returns not detected for empty object", () => {
      const jsonLine = JSON.stringify({});

      const result = detectRateLimitFromLastLine(jsonLine);

      expect(result).toEqual({ detected: false });
    });

    it("returns not detected when message.content is empty", () => {
      const jsonLine = JSON.stringify({
        type: "assistant",
        error: "rate_limit",
        isApiErrorMessage: true,
        sessionId: "abc123",
        message: { content: [] },
      });

      const result = detectRateLimitFromLastLine(jsonLine);

      expect(result).toEqual({ detected: false });
    });

    it("returns not detected when message.content has non-text type", () => {
      const jsonLine = JSON.stringify({
        type: "assistant",
        error: "rate_limit",
        isApiErrorMessage: true,
        sessionId: "abc123",
        message: {
          content: [{ type: "tool_use", id: "tool-1", name: "test" }],
        },
      });

      const result = detectRateLimitFromLastLine(jsonLine);

      expect(result).toEqual({ detected: false });
    });
  });

  describe("edge cases", () => {
    it("handles rate limit with multiple content items", () => {
      const jsonLine = JSON.stringify({
        type: "assistant",
        error: "rate_limit",
        isApiErrorMessage: true,
        sessionId: "abc123",
        message: {
          content: [
            { type: "text", text: "First message" },
            {
              type: "text",
              text: "You've hit your limit · resets 10pm (Asia/Tokyo)",
            },
          ],
        },
      });

      const result = detectRateLimitFromLastLine(jsonLine);

      // Should use the first text content
      expect(result).toEqual({
        detected: true,
        sessionId: "abc123",
        resetTimeText: "First message",
      });
    });

    it("handles whitespace around JSON line", () => {
      const jsonLine = `  ${JSON.stringify({
        type: "assistant",
        error: "rate_limit",
        isApiErrorMessage: true,
        sessionId: "abc123",
        message: {
          content: [{ type: "text", text: "Rate limit message" }],
        },
      })}  `;

      const result = detectRateLimitFromLastLine(jsonLine);

      expect(result).toEqual({
        detected: true,
        sessionId: "abc123",
        resetTimeText: "Rate limit message",
      });
    });
  });
});
