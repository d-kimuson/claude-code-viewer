import { describe, expect, test } from "vitest";
import { PrLinkEntrySchema } from "./PrLinkEntrySchema.ts";

describe("PrLinkEntrySchema", () => {
  test("accepts valid pr-link entry with all fields", () => {
    const result = PrLinkEntrySchema.safeParse({
      type: "pr-link",
      sessionId: "28fc793f-fbe6-4062-8b4a-3d6e28f65b8b",
      prNumber: 167,
      prUrl: "https://github.com/d-kimuson/claude-code-viewer/pull/167",
      prRepository: "d-kimuson/claude-code-viewer",
      timestamp: "2026-03-30T19:16:39.642Z",
    });
    expect(result.success).toBe(true);
    const data = result.success ? result.data : undefined;
    expect(data?.type).toBe("pr-link");
    expect(data?.prNumber).toBe(167);
    expect(data?.prUrl).toBe("https://github.com/d-kimuson/claude-code-viewer/pull/167");
    expect(data?.prRepository).toBe("d-kimuson/claude-code-viewer");
  });

  test("rejects missing sessionId", () => {
    const result = PrLinkEntrySchema.safeParse({
      type: "pr-link",
      prNumber: 167,
      prUrl: "https://github.com/d-kimuson/claude-code-viewer/pull/167",
      prRepository: "d-kimuson/claude-code-viewer",
      timestamp: "2026-03-30T19:16:39.642Z",
    });
    expect(result.success).toBe(false);
  });

  test("rejects missing prNumber", () => {
    const result = PrLinkEntrySchema.safeParse({
      type: "pr-link",
      sessionId: "28fc793f-fbe6-4062-8b4a-3d6e28f65b8b",
      prUrl: "https://github.com/d-kimuson/claude-code-viewer/pull/167",
      prRepository: "d-kimuson/claude-code-viewer",
      timestamp: "2026-03-30T19:16:39.642Z",
    });
    expect(result.success).toBe(false);
  });

  test("rejects missing prUrl", () => {
    const result = PrLinkEntrySchema.safeParse({
      type: "pr-link",
      sessionId: "28fc793f-fbe6-4062-8b4a-3d6e28f65b8b",
      prNumber: 167,
      prRepository: "d-kimuson/claude-code-viewer",
      timestamp: "2026-03-30T19:16:39.642Z",
    });
    expect(result.success).toBe(false);
  });

  test("rejects missing prRepository", () => {
    const result = PrLinkEntrySchema.safeParse({
      type: "pr-link",
      sessionId: "28fc793f-fbe6-4062-8b4a-3d6e28f65b8b",
      prNumber: 167,
      prUrl: "https://github.com/d-kimuson/claude-code-viewer/pull/167",
      timestamp: "2026-03-30T19:16:39.642Z",
    });
    expect(result.success).toBe(false);
  });

  test("rejects invalid timestamp", () => {
    const result = PrLinkEntrySchema.safeParse({
      type: "pr-link",
      sessionId: "28fc793f-fbe6-4062-8b4a-3d6e28f65b8b",
      prNumber: 167,
      prUrl: "https://github.com/d-kimuson/claude-code-viewer/pull/167",
      prRepository: "d-kimuson/claude-code-viewer",
      timestamp: "invalid-timestamp",
    });
    expect(result.success).toBe(false);
  });
});
