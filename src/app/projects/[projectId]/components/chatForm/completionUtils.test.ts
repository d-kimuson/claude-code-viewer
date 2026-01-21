import { describe, expect, it } from "vitest";
import { isInCompletionContext } from "./completionUtils";

describe("isInCompletionContext", () => {
  describe("command completion (/) cases", () => {
    it("should return true when message starts with / and no space after", () => {
      expect(isInCompletionContext("/")).toBe(true);
      expect(isInCompletionContext("/foo")).toBe(true);
      expect(isInCompletionContext("/commit")).toBe(true);
    });

    it("should return false when message starts with / but has space after command", () => {
      expect(isInCompletionContext("/foo ")).toBe(false);
      expect(isInCompletionContext("/commit some message")).toBe(false);
    });

    it("should return false when / is not at the start", () => {
      expect(isInCompletionContext("hello /foo")).toBe(false);
    });
  });

  describe("file completion (@) cases", () => {
    it("should return true when message ends with @ (starting file completion)", () => {
      expect(isInCompletionContext("@")).toBe(true);
      expect(isInCompletionContext("hello @")).toBe(true);
      expect(isInCompletionContext("read @file and @")).toBe(true);
    });

    it("should return true when actively typing after @", () => {
      expect(isInCompletionContext("@src")).toBe(true);
      expect(isInCompletionContext("@src/")).toBe(true);
      expect(isInCompletionContext("@src/app")).toBe(true);
      expect(isInCompletionContext("hello @src/app/")).toBe(true);
    });

    it("should return true when multiple @ symbols with last one active", () => {
      expect(isInCompletionContext("@file1.ts and @file2")).toBe(true);
      expect(isInCompletionContext("@completed.ts then @")).toBe(true);
      expect(isInCompletionContext("read @first.ts and @second")).toBe(true);
    });

    it("should return false when space follows the last @-path", () => {
      expect(isInCompletionContext("@file.ts ")).toBe(false);
      expect(isInCompletionContext("@src/app/file.ts then")).toBe(false);
      expect(isInCompletionContext("hello @file.ts world")).toBe(false);
    });

    it("should return false when @ appears in middle with completed paths", () => {
      expect(isInCompletionContext("read @file1.ts and @file2.ts ")).toBe(
        false,
      );
      expect(isInCompletionContext("@completed.ts then some other text")).toBe(
        false,
      );
    });
  });

  describe("edge cases", () => {
    it("should return false for empty message", () => {
      expect(isInCompletionContext("")).toBe(false);
    });

    it("should return false for messages without @ or /", () => {
      expect(isInCompletionContext("hello world")).toBe(false);
      expect(isInCompletionContext("some regular message")).toBe(false);
    });

    it("should handle combined cases correctly", () => {
      // Command with space ends command completion, but file completion can start
      expect(isInCompletionContext("/foo @file")).toBe(true); // File completion active
      expect(isInCompletionContext("/foo @file.ts ")).toBe(false); // Both done

      // File completion after command with space
      expect(isInCompletionContext("/commit @")).toBe(true);
      expect(isInCompletionContext("/commit @src")).toBe(true);
      expect(isInCompletionContext("/commit @src/file.ts ")).toBe(false);
    });
  });
});
