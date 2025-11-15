import { describe, expect, test } from "vitest";
import { normalizeQueueOperationContent } from "./normalizeQueueOperationContent";

describe("normalizeQueueOperationContent", () => {
  test("returns string content as-is", () => {
    const result = normalizeQueueOperationContent("Hello, world!");
    expect(result).toBe("Hello, world!");
  });

  test("extracts text from single text content object", () => {
    const result = normalizeQueueOperationContent([
      { type: "text", text: "こんにちは！" },
    ]);
    expect(result).toBe("こんにちは！");
  });

  test("extracts text from multiple text content objects", () => {
    const result = normalizeQueueOperationContent([
      { type: "text", text: "Hello" },
      { type: "text", text: "World" },
    ]);
    expect(result).toBe("Hello\nWorld");
  });

  test("extracts plain strings from array", () => {
    const result = normalizeQueueOperationContent(["Hello", "World"]);
    expect(result).toBe("Hello\nWorld");
  });

  test("handles mixed content array (strings and text objects)", () => {
    const result = normalizeQueueOperationContent([
      { type: "text", text: "Hello" },
      "Plain string",
      { type: "text", text: "World" },
    ]);
    expect(result).toBe("Hello\nPlain string\nWorld");
  });

  test("ignores non-text content types (image)", () => {
    const result = normalizeQueueOperationContent([
      { type: "text", text: "Before image" },
      {
        type: "image",
        source: {
          type: "base64",
          data: "base64data",
          media_type: "image/png",
        },
      },
      { type: "text", text: "After image" },
    ]);
    expect(result).toBe("Before image\n[Image]\nAfter image");
  });

  test("handles document content", () => {
    const result = normalizeQueueOperationContent([
      { type: "text", text: "Text" },
      {
        type: "document",
        source: {
          type: "base64",
          data: "base64data",
          media_type: "application/pdf",
        },
      },
    ]);
    expect(result).toBe("Text\n[Document]");
  });

  test("handles tool_result content", () => {
    const result = normalizeQueueOperationContent([
      { type: "text", text: "Text" },
      {
        type: "tool_result",
        tool_use_id: "tool-123",
        content: "Tool output",
        is_error: false,
      },
    ]);
    expect(result).toBe("Text\n[Tool Result]");
  });

  test("handles empty array", () => {
    const result = normalizeQueueOperationContent([]);
    expect(result).toBe("");
  });

  test("handles array with only non-text content", () => {
    const result = normalizeQueueOperationContent([
      {
        type: "image",
        source: {
          type: "base64",
          data: "base64data",
          media_type: "image/png",
        },
      },
    ]);
    expect(result).toBe("[Image]");
  });
});
