import { FileSystem } from "@effect/platform";
import { NodeContext } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { testPlatformLayer } from "../../../../testing/layers/testPlatformLayer";
import {
  pathToCommandName,
  scanCommandFilesRecursively,
  scanSkillFilesRecursively,
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

describe("scanSkillFilesRecursively", () => {
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

  it("should scan flat skill directory structure", async () => {
    // Create test skill files
    await Effect.runPromise(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        yield* fs.makeDirectory(`${testDir}/typescript`, { recursive: true });
        yield* fs.makeDirectory(`${testDir}/react`, { recursive: true });
        yield* fs.writeFileString(`${testDir}/typescript/SKILL.md`, "content");
        yield* fs.writeFileString(`${testDir}/react/SKILL.md`, "content");
      }).pipe(Effect.provide(testLayer)),
    );

    const result = await Effect.runPromise(
      scanSkillFilesRecursively(testDir).pipe(Effect.provide(testLayer)),
    );

    expect(result).toHaveLength(2);
    expect(result).toContain("typescript");
    expect(result).toContain("react");
  });

  it("should scan nested skill directory structure", async () => {
    // Create test skill files with subdirectories
    await Effect.runPromise(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        yield* fs.makeDirectory(`${testDir}/typescript`, { recursive: true });
        yield* fs.makeDirectory(`${testDir}/frontend/design`, {
          recursive: true,
        });
        yield* fs.writeFileString(`${testDir}/typescript/SKILL.md`, "content");
        yield* fs.writeFileString(
          `${testDir}/frontend/design/SKILL.md`,
          "content",
        );
      }).pipe(Effect.provide(testLayer)),
    );

    const result = await Effect.runPromise(
      scanSkillFilesRecursively(testDir).pipe(Effect.provide(testLayer)),
    );

    expect(result).toHaveLength(2);
    expect(result).toContain("typescript");
    expect(result).toContain("frontend:design");
  });

  it("should scan deeply nested skill directories", async () => {
    // Create deeply nested structure
    await Effect.runPromise(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        yield* fs.makeDirectory(`${testDir}/a/b/c`, { recursive: true });
        yield* fs.writeFileString(`${testDir}/a/b/c/SKILL.md`, "content");
      }).pipe(Effect.provide(testLayer)),
    );

    const result = await Effect.runPromise(
      scanSkillFilesRecursively(testDir).pipe(Effect.provide(testLayer)),
    );

    expect(result).toHaveLength(1);
    expect(result).toContain("a:b:c");
  });

  it("should return empty array for non-existent directory", async () => {
    const nonExistentDir = `${testDir}/non-existent`;

    const result = await Effect.runPromise(
      scanSkillFilesRecursively(nonExistentDir).pipe(Effect.provide(testLayer)),
    );

    expect(result).toEqual([]);
  });

  it("should exclude hidden files and directories", async () => {
    // Create test skill files including hidden ones
    await Effect.runPromise(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        yield* fs.makeDirectory(`${testDir}/visible`, { recursive: true });
        yield* fs.makeDirectory(`${testDir}/.hidden`, { recursive: true });
        yield* fs.writeFileString(`${testDir}/visible/SKILL.md`, "content");
        yield* fs.writeFileString(`${testDir}/.hidden/SKILL.md`, "content");
      }).pipe(Effect.provide(testLayer)),
    );

    const result = await Effect.runPromise(
      scanSkillFilesRecursively(testDir).pipe(Effect.provide(testLayer)),
    );

    expect(result).toHaveLength(1);
    expect(result).toContain("visible");
    expect(result).not.toContain(".hidden");
  });

  it("should only detect directories with SKILL.md", async () => {
    // Create directories with and without SKILL.md
    await Effect.runPromise(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        yield* fs.makeDirectory(`${testDir}/with-skill`, { recursive: true });
        yield* fs.makeDirectory(`${testDir}/without-skill`, {
          recursive: true,
        });
        yield* fs.writeFileString(`${testDir}/with-skill/SKILL.md`, "content");
        yield* fs.writeFileString(
          `${testDir}/without-skill/README.md`,
          "content",
        );
      }).pipe(Effect.provide(testLayer)),
    );

    const result = await Effect.runPromise(
      scanSkillFilesRecursively(testDir).pipe(Effect.provide(testLayer)),
    );

    expect(result).toHaveLength(1);
    expect(result).toContain("with-skill");
    expect(result).not.toContain("without-skill");
  });

  it("should handle mixed nested structures", async () => {
    // Create mixed structure: some with SKILL.md at different levels
    await Effect.runPromise(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        yield* fs.makeDirectory(`${testDir}/skill1`, { recursive: true });
        yield* fs.makeDirectory(`${testDir}/parent/skill2`, {
          recursive: true,
        });
        yield* fs.makeDirectory(`${testDir}/parent/child/skill3`, {
          recursive: true,
        });
        yield* fs.writeFileString(`${testDir}/skill1/SKILL.md`, "content");
        yield* fs.writeFileString(
          `${testDir}/parent/skill2/SKILL.md`,
          "content",
        );
        yield* fs.writeFileString(
          `${testDir}/parent/child/skill3/SKILL.md`,
          "content",
        );
      }).pipe(Effect.provide(testLayer)),
    );

    const result = await Effect.runPromise(
      scanSkillFilesRecursively(testDir).pipe(Effect.provide(testLayer)),
    );

    expect(result).toHaveLength(3);
    expect(result).toContain("skill1");
    expect(result).toContain("parent:skill2");
    expect(result).toContain("parent:child:skill3");
  });
});
