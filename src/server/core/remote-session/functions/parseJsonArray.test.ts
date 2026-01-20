import { describe, expect, it } from "vitest";
import type { ErrorJsonl } from "../../types";
import { parseJsonArray } from "./parseJsonArray";

describe("parseJsonArray", () => {
  describe("valid JSON arrays", () => {
    it("parses a single user entry", () => {
      const json = JSON.stringify([
        {
          type: "user",
          uuid: "550e8400-e29b-41d4-a716-446655440000",
          timestamp: "2024-01-01T00:00:00.000Z",
          message: { role: "user", content: "Hello" },
          isSidechain: false,
          userType: "external",
          cwd: "/test",
          sessionId: "session-1",
          version: "1.0.0",
          parentUuid: null,
        },
      ]);

      const result = parseJsonArray(json);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty("type", "user");
      const entry = result[0];
      if (entry && entry.type === "user") {
        expect(entry.message.content).toBe("Hello");
      }
    });

    it("parses multiple entries", () => {
      const json = JSON.stringify([
        {
          type: "user",
          uuid: "550e8400-e29b-41d4-a716-446655440000",
          timestamp: "2024-01-01T00:00:00.000Z",
          message: { role: "user", content: "Hello" },
          isSidechain: false,
          userType: "external",
          cwd: "/test",
          sessionId: "session-1",
          version: "1.0.0",
          parentUuid: null,
        },
        {
          type: "summary",
          summary: "Test summary",
          leafUuid: "550e8400-e29b-41d4-a716-446655440002",
        },
      ]);

      const result = parseJsonArray(json);

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty("type", "user");
      expect(result[1]).toHaveProperty("type", "summary");
    });

    it("parses an empty array", () => {
      const json = JSON.stringify([]);

      const result = parseJsonArray(json);

      expect(result).toEqual([]);
    });
  });

  describe("error handling", () => {
    it("throws on invalid JSON", () => {
      const invalidJson = "not valid json";

      expect(() => parseJsonArray(invalidJson)).toThrow();
    });

    it("throws when JSON is not an array", () => {
      const notArray = JSON.stringify({ type: "user" });

      expect(() => parseJsonArray(notArray)).toThrow("Expected an array");
    });

    it("returns ErrorJsonl for entries that fail schema validation", () => {
      const json = JSON.stringify([
        {
          type: "unknown",
          someField: "value",
        },
      ]);

      const result = parseJsonArray(json);

      expect(result).toHaveLength(1);
      const errorEntry = result[0] as ErrorJsonl;
      expect(errorEntry.type).toBe("x-error");
      expect(errorEntry.lineNumber).toBe(1);
    });

    it("returns ErrorJsonl for entries missing required fields", () => {
      const json = JSON.stringify([
        {
          type: "user",
          uuid: "550e8400-e29b-41d4-a716-446655440000",
          // missing timestamp, message, etc.
        },
      ]);

      const result = parseJsonArray(json);

      expect(result).toHaveLength(1);
      const errorEntry = result[0] as ErrorJsonl;
      expect(errorEntry.type).toBe("x-error");
      expect(errorEntry.lineNumber).toBe(1);
    });

    it("returns mixed valid entries and ErrorJsonl entries", () => {
      const json = JSON.stringify([
        {
          type: "user",
          uuid: "550e8400-e29b-41d4-a716-446655440000",
          timestamp: "2024-01-01T00:00:00.000Z",
          message: { role: "user", content: "Hello" },
          isSidechain: false,
          userType: "external",
          cwd: "/test",
          sessionId: "session-1",
          version: "1.0.0",
          parentUuid: null,
        },
        { type: "invalid-schema" },
        {
          type: "summary",
          summary: "Summary text",
          leafUuid: "550e8400-e29b-41d4-a716-446655440001",
        },
      ]);

      const result = parseJsonArray(json);

      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty("type", "user");
      expect(result[1]).toHaveProperty("type", "x-error");
      expect(result[2]).toHaveProperty("type", "summary");

      const errorEntry = result[1] as ErrorJsonl;
      expect(errorEntry.lineNumber).toBe(2);
    });
  });

  describe("index tracking", () => {
    it("records correct index for schema validation errors", () => {
      const json = JSON.stringify([
        {
          type: "user",
          uuid: "550e8400-e29b-41d4-a716-446655440000",
          timestamp: "2024-01-01T00:00:00.000Z",
          message: { role: "user", content: "Line 1" },
          isSidechain: false,
          userType: "external",
          cwd: "/test",
          sessionId: "session-1",
          version: "1.0.0",
          parentUuid: null,
        },
        { type: "invalid", data: "schema error" },
        {
          type: "user",
          uuid: "550e8400-e29b-41d4-a716-446655440001",
          timestamp: "2024-01-01T00:00:01.000Z",
          message: { role: "user", content: "Line 3" },
          isSidechain: false,
          userType: "external",
          cwd: "/test",
          sessionId: "session-1",
          version: "1.0.0",
          parentUuid: null,
        },
        { type: "another-invalid" },
      ]);

      const result = parseJsonArray(json);

      expect(result).toHaveLength(4);
      expect((result[1] as ErrorJsonl).lineNumber).toBe(2);
      expect((result[1] as ErrorJsonl).type).toBe("x-error");
      expect((result[3] as ErrorJsonl).lineNumber).toBe(4);
      expect((result[3] as ErrorJsonl).type).toBe("x-error");
    });
  });

  describe("conversation schema variations", () => {
    it("parses user entry with optional fields", () => {
      const json = JSON.stringify([
        {
          type: "user",
          uuid: "550e8400-e29b-41d4-a716-446655440000",
          timestamp: "2024-01-01T00:00:00.000Z",
          message: { role: "user", content: "Hello" },
          isSidechain: true,
          userType: "external",
          cwd: "/test",
          sessionId: "session-1",
          version: "1.0.0",
          parentUuid: "550e8400-e29b-41d4-a716-446655440099",
          gitBranch: "main",
          isMeta: false,
        },
      ]);

      const result = parseJsonArray(json);

      expect(result).toHaveLength(1);
      const entry = result[0];
      if (entry && entry.type === "user") {
        expect(entry.isSidechain).toBe(true);
        expect(entry.parentUuid).toBe("550e8400-e29b-41d4-a716-446655440099");
        expect(entry.gitBranch).toBe("main");
      }
    });

    it("parses many entries", () => {
      const entries = Array.from({ length: 100 }, (_, i) => ({
        type: "user",
        uuid: `550e8400-e29b-41d4-a716-${String(i).padStart(12, "0")}`,
        timestamp: new Date(Date.UTC(2024, 0, 1, 0, 0, i)).toISOString(),
        message: {
          role: "user",
          content: `Message ${i}`,
        },
        isSidechain: false,
        userType: "external",
        cwd: "/test",
        sessionId: "session-1",
        version: "1.0.0",
        parentUuid:
          i > 0
            ? `550e8400-e29b-41d4-a716-${String(i - 1).padStart(12, "0")}`
            : null,
      }));

      const json = JSON.stringify(entries);
      const result = parseJsonArray(json);

      expect(result).toHaveLength(100);
      expect(result.every((entry) => entry.type === "user")).toBe(true);
    });
  });
});
