import { FileSystem } from "@effect/platform";
import { NodeContext } from "@effect/platform-node";
import { it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { afterEach, beforeEach, describe, expect } from "vitest";
import { testPlatformLayer } from "../../../../testing/layers/testPlatformLayer.ts";
import { extractLastNonEmptyLine, readLastLine } from "./readLastLine.ts";

const testLayer = Layer.provide(NodeContext.layer, testPlatformLayer());

describe("extractLastNonEmptyLine", () => {
  it("should return the last line from content", () => {
    expect(extractLastNonEmptyLine("line1\nline2\nline3")).toBe("line3");
  });

  it("should ignore trailing newlines", () => {
    expect(extractLastNonEmptyLine("line1\nline2\nline3\n")).toBe("line3");
  });

  it("should ignore multiple trailing newlines", () => {
    expect(extractLastNonEmptyLine("line1\nline2\nline3\n\n\n")).toBe("line3");
  });

  it("should handle single line without newline", () => {
    expect(extractLastNonEmptyLine("single line")).toBe("single line");
  });

  it("should handle single line with newline", () => {
    expect(extractLastNonEmptyLine("single line\n")).toBe("single line");
  });

  it("should return empty string for empty content", () => {
    expect(extractLastNonEmptyLine("")).toBe("");
  });

  it("should return empty string for content with only newlines", () => {
    expect(extractLastNonEmptyLine("\n\n\n")).toBe("");
  });

  it("should handle CRLF line endings", () => {
    expect(extractLastNonEmptyLine("line1\r\nline2\r\nline3\r\n")).toBe("line3");
  });

  it("should handle mixed LF and CRLF line endings", () => {
    expect(extractLastNonEmptyLine("line1\nline2\r\nline3\n")).toBe("line3");
  });

  it("should skip lines with only whitespace", () => {
    expect(extractLastNonEmptyLine("line1\nline2\n   \n\t\n")).toBe("line2");
  });

  it("should preserve whitespace in the last valid line", () => {
    expect(extractLastNonEmptyLine("  indented line  \n")).toBe("  indented line  ");
  });
});

describe("readLastLine", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await Effect.runPromise(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        return yield* fs.makeTempDirectory();
      }).pipe(Effect.provide(testLayer)),
    );
  });

  afterEach(async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        yield* fs.remove(testDir, { recursive: true });
      }).pipe(Effect.provide(testLayer)),
    );
  });

  it.live("should return the last line of a single-line file", () =>
    Effect.gen(function* () {
      const filePath = `${testDir}/single-line.txt`;
      const fs = yield* FileSystem.FileSystem;
      yield* fs.writeFileString(filePath, "only line");

      const result = yield* readLastLine(filePath);

      expect(result).toBe("only line");
    }).pipe(Effect.provide(testLayer)),
  );

  it.live("should return the last line of a multi-line file", () =>
    Effect.gen(function* () {
      const filePath = `${testDir}/multi-line.txt`;
      const fs = yield* FileSystem.FileSystem;
      yield* fs.writeFileString(filePath, "first line\nsecond line\nlast line");

      const result = yield* readLastLine(filePath);

      expect(result).toBe("last line");
    }).pipe(Effect.provide(testLayer)),
  );

  it.live("should ignore trailing newlines", () =>
    Effect.gen(function* () {
      const filePath = `${testDir}/trailing-newline.txt`;
      const fs = yield* FileSystem.FileSystem;
      yield* fs.writeFileString(filePath, "first line\nsecond line\nlast line\n");

      const result = yield* readLastLine(filePath);

      expect(result).toBe("last line");
    }).pipe(Effect.provide(testLayer)),
  );

  it.live("should ignore multiple trailing newlines", () =>
    Effect.gen(function* () {
      const filePath = `${testDir}/multiple-trailing.txt`;
      const fs = yield* FileSystem.FileSystem;
      yield* fs.writeFileString(filePath, "first line\nsecond line\nlast line\n\n\n");

      const result = yield* readLastLine(filePath);

      expect(result).toBe("last line");
    }).pipe(Effect.provide(testLayer)),
  );

  it.live("should return empty string for empty file", () =>
    Effect.gen(function* () {
      const filePath = `${testDir}/empty.txt`;
      const fs = yield* FileSystem.FileSystem;
      yield* fs.writeFileString(filePath, "");

      const result = yield* readLastLine(filePath);

      expect(result).toBe("");
    }).pipe(Effect.provide(testLayer)),
  );

  it.live("should return empty string for file with only newlines", () =>
    Effect.gen(function* () {
      const filePath = `${testDir}/only-newlines.txt`;
      const fs = yield* FileSystem.FileSystem;
      yield* fs.writeFileString(filePath, "\n\n\n");

      const result = yield* readLastLine(filePath);

      expect(result).toBe("");
    }).pipe(Effect.provide(testLayer)),
  );

  it.live("should handle CRLF line endings", () =>
    Effect.gen(function* () {
      const filePath = `${testDir}/crlf.txt`;
      const fs = yield* FileSystem.FileSystem;
      yield* fs.writeFileString(filePath, "first line\r\nsecond line\r\nlast line\r\n");

      const result = yield* readLastLine(filePath);

      expect(result).toBe("last line");
    }).pipe(Effect.provide(testLayer)),
  );

  it.live("should handle JSON line content (JSONL format)", () =>
    Effect.gen(function* () {
      const jsonContent = '{"sessionId":"abc123","type":"assistant"}';
      const filePath = `${testDir}/session.jsonl`;
      const fs = yield* FileSystem.FileSystem;
      yield* fs.writeFileString(filePath, `{"first":"line"}\n${jsonContent}\n`);

      const result = yield* readLastLine(filePath);

      expect(result).toBe(jsonContent);
    }).pipe(Effect.provide(testLayer)),
  );

  it.live("should fail for non-existent file", () =>
    Effect.gen(function* () {
      const filePath = `${testDir}/non-existent.txt`;

      const result = yield* readLastLine(filePath).pipe(Effect.flip);

      expect(result._tag).toBe("SystemError");
    }).pipe(Effect.provide(testLayer)),
  );

  it.live("should handle large file by reading only the tail", () =>
    Effect.gen(function* () {
      // Create a file larger than the buffer size (10KB = 10240 bytes)
      // Use 1KB lines so we have clear boundaries
      const lineContent = "x".repeat(1000);
      // Create 15 lines (15KB total) - more than the 10KB buffer
      const lines = Array.from({ length: 15 }, (_, i) =>
        i === 14 ? "last-unique-line" : `${lineContent}-line-${i}`,
      );
      const filePath = `${testDir}/large-file.txt`;
      const fs = yield* FileSystem.FileSystem;
      yield* fs.writeFileString(filePath, `${lines.join("\n")}\n`);

      const result = yield* readLastLine(filePath);

      expect(result).toBe("last-unique-line");
    }).pipe(Effect.provide(testLayer)),
  );

  it.live("should handle file smaller than buffer size", () =>
    Effect.gen(function* () {
      const filePath = `${testDir}/small.txt`;
      const fs = yield* FileSystem.FileSystem;
      yield* fs.writeFileString(filePath, "small content");

      const result = yield* readLastLine(filePath);

      expect(result).toBe("small content");
    }).pipe(Effect.provide(testLayer)),
  );
});
