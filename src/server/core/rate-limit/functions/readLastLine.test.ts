import { FileSystem } from "@effect/platform";
import { NodeContext } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { testPlatformLayer } from "../../../../testing/layers/testPlatformLayer";
import { extractLastNonEmptyLine, readLastLine } from "./readLastLine";

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
    expect(extractLastNonEmptyLine("line1\r\nline2\r\nline3\r\n")).toBe(
      "line3",
    );
  });

  it("should handle mixed LF and CRLF line endings", () => {
    expect(extractLastNonEmptyLine("line1\nline2\r\nline3\n")).toBe("line3");
  });

  it("should skip lines with only whitespace", () => {
    expect(extractLastNonEmptyLine("line1\nline2\n   \n\t\n")).toBe("line2");
  });

  it("should preserve whitespace in the last valid line", () => {
    expect(extractLastNonEmptyLine("  indented line  \n")).toBe(
      "  indented line  ",
    );
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

  it("should return the last line of a single-line file", async () => {
    const filePath = `${testDir}/single-line.txt`;
    await Effect.runPromise(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        yield* fs.writeFileString(filePath, "only line");
      }).pipe(Effect.provide(testLayer)),
    );

    const result = await Effect.runPromise(
      readLastLine(filePath).pipe(Effect.provide(testLayer)),
    );

    expect(result).toBe("only line");
  });

  it("should return the last line of a multi-line file", async () => {
    const filePath = `${testDir}/multi-line.txt`;
    await Effect.runPromise(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        yield* fs.writeFileString(
          filePath,
          "first line\nsecond line\nlast line",
        );
      }).pipe(Effect.provide(testLayer)),
    );

    const result = await Effect.runPromise(
      readLastLine(filePath).pipe(Effect.provide(testLayer)),
    );

    expect(result).toBe("last line");
  });

  it("should ignore trailing newlines", async () => {
    const filePath = `${testDir}/trailing-newline.txt`;
    await Effect.runPromise(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        yield* fs.writeFileString(
          filePath,
          "first line\nsecond line\nlast line\n",
        );
      }).pipe(Effect.provide(testLayer)),
    );

    const result = await Effect.runPromise(
      readLastLine(filePath).pipe(Effect.provide(testLayer)),
    );

    expect(result).toBe("last line");
  });

  it("should ignore multiple trailing newlines", async () => {
    const filePath = `${testDir}/multiple-trailing.txt`;
    await Effect.runPromise(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        yield* fs.writeFileString(
          filePath,
          "first line\nsecond line\nlast line\n\n\n",
        );
      }).pipe(Effect.provide(testLayer)),
    );

    const result = await Effect.runPromise(
      readLastLine(filePath).pipe(Effect.provide(testLayer)),
    );

    expect(result).toBe("last line");
  });

  it("should return empty string for empty file", async () => {
    const filePath = `${testDir}/empty.txt`;
    await Effect.runPromise(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        yield* fs.writeFileString(filePath, "");
      }).pipe(Effect.provide(testLayer)),
    );

    const result = await Effect.runPromise(
      readLastLine(filePath).pipe(Effect.provide(testLayer)),
    );

    expect(result).toBe("");
  });

  it("should return empty string for file with only newlines", async () => {
    const filePath = `${testDir}/only-newlines.txt`;
    await Effect.runPromise(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        yield* fs.writeFileString(filePath, "\n\n\n");
      }).pipe(Effect.provide(testLayer)),
    );

    const result = await Effect.runPromise(
      readLastLine(filePath).pipe(Effect.provide(testLayer)),
    );

    expect(result).toBe("");
  });

  it("should handle CRLF line endings", async () => {
    const filePath = `${testDir}/crlf.txt`;
    await Effect.runPromise(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        yield* fs.writeFileString(
          filePath,
          "first line\r\nsecond line\r\nlast line\r\n",
        );
      }).pipe(Effect.provide(testLayer)),
    );

    const result = await Effect.runPromise(
      readLastLine(filePath).pipe(Effect.provide(testLayer)),
    );

    expect(result).toBe("last line");
  });

  it("should handle JSON line content (JSONL format)", async () => {
    const jsonContent = '{"sessionId":"abc123","type":"assistant"}';
    const filePath = `${testDir}/session.jsonl`;
    await Effect.runPromise(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        yield* fs.writeFileString(
          filePath,
          `{"first":"line"}\n${jsonContent}\n`,
        );
      }).pipe(Effect.provide(testLayer)),
    );

    const result = await Effect.runPromise(
      readLastLine(filePath).pipe(Effect.provide(testLayer)),
    );

    expect(result).toBe(jsonContent);
  });

  it("should fail for non-existent file", async () => {
    const filePath = `${testDir}/non-existent.txt`;

    const result = await Effect.runPromise(
      readLastLine(filePath).pipe(Effect.flip, Effect.provide(testLayer)),
    );

    expect(result._tag).toBe("SystemError");
  });

  it("should handle large file by reading only the tail", async () => {
    // Create a file larger than the buffer size (10KB = 10240 bytes)
    // Use 1KB lines so we have clear boundaries
    const lineContent = "x".repeat(1000);
    // Create 15 lines (15KB total) - more than the 10KB buffer
    const lines = Array.from({ length: 15 }, (_, i) =>
      i === 14 ? "last-unique-line" : `${lineContent}-line-${i}`,
    );
    const filePath = `${testDir}/large-file.txt`;
    await Effect.runPromise(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        yield* fs.writeFileString(filePath, `${lines.join("\n")}\n`);
      }).pipe(Effect.provide(testLayer)),
    );

    const result = await Effect.runPromise(
      readLastLine(filePath).pipe(Effect.provide(testLayer)),
    );

    expect(result).toBe("last-unique-line");
  });

  it("should handle file smaller than buffer size", async () => {
    const filePath = `${testDir}/small.txt`;
    await Effect.runPromise(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        yield* fs.writeFileString(filePath, "small content");
      }).pipe(Effect.provide(testLayer)),
    );

    const result = await Effect.runPromise(
      readLastLine(filePath).pipe(Effect.provide(testLayer)),
    );

    expect(result).toBe("small content");
  });
});
