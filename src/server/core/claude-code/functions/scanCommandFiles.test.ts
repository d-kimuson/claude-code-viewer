import { FileSystem } from "@effect/platform";
import { NodeContext } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { testPlatformLayer } from "../../../../testing/layers/testPlatformLayer";
import {
  pathToCommandName,
  scanCommandFilesRecursively,
} from "./scanCommandFiles";

const testLayer = Layer.provide(NodeContext.layer, testPlatformLayer());

describe("pathToCommandName", () => {
  it("should convert flat file path to command name", () => {
    const result = pathToCommandName(
      "/base/commands/impl.md",
      "/base/commands",
    );
    expect(result).toBe("impl");
  });

  it("should convert subdirectory file path to colon-separated command name", () => {
    const result = pathToCommandName(
      "/base/commands/frontend/impl.md",
      "/base/commands",
    );
    expect(result).toBe("frontend:impl");
  });

  it("should convert deeply nested file path to colon-separated command name", () => {
    const result = pathToCommandName(
      "/base/commands/frontend/components/button.md",
      "/base/commands",
    );
    expect(result).toBe("frontend:components:button");
  });

  it("should remove .md extension", () => {
    const result = pathToCommandName(
      "/base/commands/test.md",
      "/base/commands",
    );
    expect(result).toBe("test");
  });

  it("should handle paths with trailing slash in base path", () => {
    const result = pathToCommandName(
      "/base/commands/frontend/impl.md",
      "/base/commands/",
    );
    expect(result).toBe("frontend:impl");
  });
});

describe("scanCommandFilesRecursively", () => {
  let testDir: string;

  beforeEach(async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const tmpDir = yield* fs.makeTempDirectoryScoped();
        return tmpDir;
      }).pipe(Effect.provide(testLayer), Effect.scoped),
    );

    testDir = result;
  });

  afterEach(async () => {
    // Cleanup is handled by scoped temp directory
  });

  it("should scan flat directory structure", async () => {
    // Create test files
    await Effect.runPromise(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        yield* fs.makeDirectory(testDir, { recursive: true });
        yield* fs.writeFileString(`${testDir}/impl.md`, "content");
        yield* fs.writeFileString(`${testDir}/review.md`, "content");
      }).pipe(Effect.provide(testLayer)),
    );

    const result = await Effect.runPromise(
      scanCommandFilesRecursively(testDir).pipe(Effect.provide(testLayer)),
    );

    expect(result).toHaveLength(2);
    expect(result).toContain("impl");
    expect(result).toContain("review");
  });

  it("should scan subdirectories recursively", async () => {
    // Create test files with subdirectories
    await Effect.runPromise(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        yield* fs.makeDirectory(`${testDir}/frontend`, { recursive: true });
        yield* fs.writeFileString(`${testDir}/impl.md`, "content");
        yield* fs.writeFileString(`${testDir}/frontend/impl.md`, "content");
        yield* fs.writeFileString(`${testDir}/frontend/review.md`, "content");
      }).pipe(Effect.provide(testLayer)),
    );

    const result = await Effect.runPromise(
      scanCommandFilesRecursively(testDir).pipe(Effect.provide(testLayer)),
    );

    expect(result).toHaveLength(3);
    expect(result).toContain("impl");
    expect(result).toContain("frontend:impl");
    expect(result).toContain("frontend:review");
  });

  it("should scan deeply nested directories", async () => {
    // Create deeply nested structure
    await Effect.runPromise(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        yield* fs.makeDirectory(`${testDir}/frontend/components/buttons`, {
          recursive: true,
        });
        yield* fs.writeFileString(
          `${testDir}/frontend/components/buttons/primary.md`,
          "content",
        );
      }).pipe(Effect.provide(testLayer)),
    );

    const result = await Effect.runPromise(
      scanCommandFilesRecursively(testDir).pipe(Effect.provide(testLayer)),
    );

    expect(result).toHaveLength(1);
    expect(result).toContain("frontend:components:buttons:primary");
  });

  it("should return empty array for non-existent directory", async () => {
    const nonExistentDir = `${testDir}/non-existent`;

    const result = await Effect.runPromise(
      scanCommandFilesRecursively(nonExistentDir).pipe(
        Effect.provide(testLayer),
      ),
    );

    expect(result).toEqual([]);
  });

  it("should exclude hidden files and directories", async () => {
    // Create test files including hidden ones
    await Effect.runPromise(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        yield* fs.makeDirectory(`${testDir}/.hidden`, { recursive: true });
        yield* fs.writeFileString(`${testDir}/visible.md`, "content");
        yield* fs.writeFileString(`${testDir}/.hidden.md`, "content");
        yield* fs.writeFileString(`${testDir}/.hidden/impl.md`, "content");
      }).pipe(Effect.provide(testLayer)),
    );

    const result = await Effect.runPromise(
      scanCommandFilesRecursively(testDir).pipe(Effect.provide(testLayer)),
    );

    expect(result).toHaveLength(1);
    expect(result).toContain("visible");
    expect(result).not.toContain(".hidden");
    expect(result).not.toContain(".hidden:impl");
  });

  it("should only include .md files", async () => {
    // Create various file types
    await Effect.runPromise(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        yield* fs.makeDirectory(testDir, { recursive: true });
        yield* fs.writeFileString(`${testDir}/command.md`, "content");
        yield* fs.writeFileString(`${testDir}/readme.txt`, "content");
        yield* fs.writeFileString(`${testDir}/config.json`, "content");
      }).pipe(Effect.provide(testLayer)),
    );

    const result = await Effect.runPromise(
      scanCommandFilesRecursively(testDir).pipe(Effect.provide(testLayer)),
    );

    expect(result).toHaveLength(1);
    expect(result).toContain("command");
  });
});
