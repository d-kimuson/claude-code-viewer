import { describe, expect, test } from "vitest";
import { QueueOperationEntrySchema } from "./QueueOperationEntrySchema";

describe("QueueOperationEntrySchema", () => {
  describe("enqueue operation", () => {
    test("accepts old format with string content", () => {
      const result = QueueOperationEntrySchema.safeParse({
        type: "queue-operation",
        operation: "enqueue",
        timestamp: "2025-11-12T15:01:25.792Z",
        content: "hi, how are you today?",
        sessionId: "abc123",
      });
      expect(result.success).toBe(true);
    });

    test("accepts new format with array content", () => {
      const result = QueueOperationEntrySchema.safeParse({
        type: "queue-operation",
        operation: "enqueue",
        timestamp: "2025-11-15T04:36:38.085Z",
        content: [{ type: "text", text: "こんにちは！" }],
        sessionId: "9bb43739-21f2-45f2-bf3c-9270ba0dddca",
      });
      expect(result.success).toBe(true);
    });

    test("accepts array content with multiple text items", () => {
      const result = QueueOperationEntrySchema.safeParse({
        type: "queue-operation",
        operation: "enqueue",
        timestamp: "2025-11-15T04:36:38.085Z",
        content: [
          { type: "text", text: "Hello" },
          { type: "text", text: "World" },
        ],
        sessionId: "abc123",
      });
      expect(result.success).toBe(true);
    });

    test("accepts array content with string items", () => {
      const result = QueueOperationEntrySchema.safeParse({
        type: "queue-operation",
        operation: "enqueue",
        timestamp: "2025-11-15T04:36:38.085Z",
        content: ["Hello", "World"],
        sessionId: "abc123",
      });
      expect(result.success).toBe(true);
    });

    test("accepts array content with mixed content types", () => {
      const result = QueueOperationEntrySchema.safeParse({
        type: "queue-operation",
        operation: "enqueue",
        timestamp: "2025-11-15T04:36:38.085Z",
        content: [
          { type: "text", text: "Hello" },
          "Plain string",
          {
            type: "image",
            source: {
              type: "base64",
              data: "base64data",
              media_type: "image/png",
            },
          },
        ],
        sessionId: "abc123",
      });
      expect(result.success).toBe(true);
    });

    test("rejects invalid timestamp", () => {
      const result = QueueOperationEntrySchema.safeParse({
        type: "queue-operation",
        operation: "enqueue",
        timestamp: "invalid-timestamp",
        content: "test",
        sessionId: "abc123",
      });
      expect(result.success).toBe(false);
    });

    test("rejects missing sessionId", () => {
      const result = QueueOperationEntrySchema.safeParse({
        type: "queue-operation",
        operation: "enqueue",
        timestamp: "2025-11-15T04:36:38.085Z",
        content: "test",
      });
      expect(result.success).toBe(false);
    });

    test("rejects missing content", () => {
      const result = QueueOperationEntrySchema.safeParse({
        type: "queue-operation",
        operation: "enqueue",
        timestamp: "2025-11-15T04:36:38.085Z",
        sessionId: "abc123",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("dequeue operation", () => {
    test("accepts valid dequeue operation", () => {
      const result = QueueOperationEntrySchema.safeParse({
        type: "queue-operation",
        operation: "dequeue",
        timestamp: "2025-11-15T04:36:38.085Z",
        sessionId: "abc123",
      });
      expect(result.success).toBe(true);
    });

    test("rejects invalid timestamp", () => {
      const result = QueueOperationEntrySchema.safeParse({
        type: "queue-operation",
        operation: "dequeue",
        timestamp: "invalid",
        sessionId: "abc123",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("popAll operation", () => {
    test("accepts valid popAll operation with content", () => {
      const result = QueueOperationEntrySchema.safeParse({
        type: "queue-operation",
        operation: "popAll",
        timestamp: "2026-01-12T08:10:11.883Z",
        sessionId: "e3e4a2ef-c6b5-4c39-a1f9-713a943be524",
        content: "the session has total_ammount",
      });
      expect(result.success).toBe(true);
    });

    test("accepts popAll operation without content", () => {
      const result = QueueOperationEntrySchema.safeParse({
        type: "queue-operation",
        operation: "popAll",
        timestamp: "2026-01-12T08:10:11.883Z",
        sessionId: "abc123",
      });
      expect(result.success).toBe(true);
    });
  });
});
