import { describe, expect, test } from "vitest";
import { ToolResultContentSchema } from "./ToolResultContentSchema.ts";

describe("ToolResultContentSchema", () => {
  test("accepts tool_result with string content", () => {
    const result = ToolResultContentSchema.safeParse({
      type: "tool_result",
      tool_use_id: "toolu_01ABC",
      content: "some text result",
    });
    expect(result.success).toBe(true);
  });

  test("accepts tool_result with text content array", () => {
    const result = ToolResultContentSchema.safeParse({
      type: "tool_result",
      tool_use_id: "toolu_01ABC",
      content: [{ type: "text", text: "hello" }],
    });
    expect(result.success).toBe(true);
  });

  test("accepts tool_result with image content array", () => {
    const result = ToolResultContentSchema.safeParse({
      type: "tool_result",
      tool_use_id: "toolu_01ABC",
      content: [
        {
          type: "image",
          source: {
            type: "base64",
            data: "abc123",
            media_type: "image/png",
          },
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  test("accepts tool_result with tool_reference content array", () => {
    const result = ToolResultContentSchema.safeParse({
      type: "tool_result",
      tool_use_id: "toolu_0168hemkf77XoNPxmrGaDGbH",
      content: [
        { type: "tool_reference", tool_name: "WebFetch" },
        { type: "tool_reference", tool_name: "TaskCreate" },
      ],
    });
    expect(result.success).toBe(true);
  });

  test("accepts tool_result with mixed content array", () => {
    const result = ToolResultContentSchema.safeParse({
      type: "tool_result",
      tool_use_id: "toolu_01ABC",
      content: [
        { type: "text", text: "some text" },
        { type: "tool_reference", tool_name: "WebFetch" },
      ],
    });
    expect(result.success).toBe(true);
  });

  test("accepts tool_result with is_error flag", () => {
    const result = ToolResultContentSchema.safeParse({
      type: "tool_result",
      tool_use_id: "toolu_01ABC",
      content: "error message",
      is_error: true,
    });
    expect(result.success).toBe(true);
  });

  test("rejects tool_result with unknown content type in array", () => {
    const result = ToolResultContentSchema.safeParse({
      type: "tool_result",
      tool_use_id: "toolu_01ABC",
      content: [{ type: "unknown_type", data: "something" }],
    });
    expect(result.success).toBe(false);
  });
});
