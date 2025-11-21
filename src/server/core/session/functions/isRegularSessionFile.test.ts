import { describe, expect, it } from "vitest";
import { isRegularSessionFile } from "./isRegularSessionFile";

describe("isRegularSessionFile", () => {
  describe("returns true for regular session files", () => {
    it("handles simple session ID", () => {
      expect(isRegularSessionFile("session-id.jsonl")).toBe(true);
    });

    it("handles UUID-like session ID", () => {
      expect(
        isRegularSessionFile("550e8400-e29b-41d4-a716-446655440000.jsonl"),
      ).toBe(true);
    });

    it("handles session ID with numbers", () => {
      expect(isRegularSessionFile("session123.jsonl")).toBe(true);
    });

    it("handles session ID with hyphens", () => {
      expect(isRegularSessionFile("my-session-id.jsonl")).toBe(true);
    });
  });

  describe("returns false for agent session files", () => {
    it("excludes agent- prefixed files", () => {
      expect(isRegularSessionFile("agent-abc123.jsonl")).toBe(false);
    });

    it("excludes agent- prefixed files with UUID-like hash", () => {
      expect(
        isRegularSessionFile(
          "agent-550e8400-e29b-41d4-a716-446655440000.jsonl",
        ),
      ).toBe(false);
    });
  });

  describe("returns false for non-jsonl files", () => {
    it("excludes .json files", () => {
      expect(isRegularSessionFile("session.json")).toBe(false);
    });

    it("excludes .txt files", () => {
      expect(isRegularSessionFile("session.txt")).toBe(false);
    });

    it("excludes files without extension", () => {
      expect(isRegularSessionFile("session")).toBe(false);
    });

    it("excludes agent files without .jsonl extension", () => {
      expect(isRegularSessionFile("agent-abc123.json")).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("handles empty string", () => {
      expect(isRegularSessionFile("")).toBe(false);
    });

    it("handles just .jsonl extension", () => {
      expect(isRegularSessionFile(".jsonl")).toBe(true);
    });

    it("handles files with agent in the middle of name", () => {
      // "my-agent-session.jsonl" should be a valid session file
      // because it doesn't START with "agent-"
      expect(isRegularSessionFile("my-agent-session.jsonl")).toBe(true);
    });

    it("handles case-sensitive agent prefix", () => {
      // "Agent-" (uppercase A) should be treated as a regular session file
      // because the pattern is case-sensitive
      expect(isRegularSessionFile("Agent-abc123.jsonl")).toBe(true);
    });
  });
});
