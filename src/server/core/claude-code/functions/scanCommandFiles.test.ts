import { FileSystem } from "@effect/platform";
import { NodeContext } from "@effect/platform-node";
import { it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { afterEach, beforeEach, describe, expect } from "vitest";
import { testPlatformLayer } from "../../../../testing/layers/testPlatformLayer.ts";
import {
  pathToCommandName,
  scanCommandFilesRecursively,
  scanSkillFilesRecursively,
} from "./scanCommandFiles.ts";

const testLayer = Layer.provide(NodeContext.layer, testPlatformLayer());

describe("pathToCommandName", () => {
  it("should convert flat file path to command name", () => {
    const result = pathToCommandName("/base/commands/impl.md", "/base/commands");
    expect(result).toBe("impl");
  });

  it("should convert subdirectory file path to colon-separated command name", () => {
    const result = pathToCommandName("/base/commands/frontend/impl.md", "/base/commands");
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
    const result = pathToCommandName("/base/commands/test.md", "/base/commands");
    expect(result).toBe("test");
  });

  it("should handle paths with trailing slash in base path", () => {
    const result = pathToCommandName("/base/commands/frontend/impl.md", "/base/commands/");
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

  it.live("should scan flat directory structure", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      yield* fs.makeDirectory(testDir, { recursive: true });
      yield* fs.writeFileString(`${testDir}/impl.md`, "content");
      yield* fs.writeFileString(`${testDir}/review.md`, "content");

      const result = yield* scanCommandFilesRecursively(testDir);

      expect(result).toHaveLength(2);
      expect(result).toContain("impl");
      expect(result).toContain("review");
    }).pipe(Effect.provide(testLayer)),
  );

  it.live("should scan subdirectories recursively", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      yield* fs.makeDirectory(`${testDir}/frontend`, { recursive: true });
      yield* fs.writeFileString(`${testDir}/impl.md`, "content");
      yield* fs.writeFileString(`${testDir}/frontend/impl.md`, "content");
      yield* fs.writeFileString(`${testDir}/frontend/review.md`, "content");

      const result = yield* scanCommandFilesRecursively(testDir);

      expect(result).toHaveLength(3);
      expect(result).toContain("impl");
      expect(result).toContain("frontend:impl");
      expect(result).toContain("frontend:review");
    }).pipe(Effect.provide(testLayer)),
  );

  it.live("should scan deeply nested directories", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      yield* fs.makeDirectory(`${testDir}/frontend/components/buttons`, {
        recursive: true,
      });
      yield* fs.writeFileString(`${testDir}/frontend/components/buttons/primary.md`, "content");

      const result = yield* scanCommandFilesRecursively(testDir);

      expect(result).toHaveLength(1);
      expect(result).toContain("frontend:components:buttons:primary");
    }).pipe(Effect.provide(testLayer)),
  );

  it.live("should return empty array for non-existent directory", () =>
    Effect.gen(function* () {
      const nonExistentDir = `${testDir}/non-existent`;

      const result = yield* scanCommandFilesRecursively(nonExistentDir);

      expect(result).toEqual([]);
    }).pipe(Effect.provide(testLayer)),
  );

  it.live("should exclude hidden files and directories", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      yield* fs.makeDirectory(`${testDir}/.hidden`, { recursive: true });
      yield* fs.writeFileString(`${testDir}/visible.md`, "content");
      yield* fs.writeFileString(`${testDir}/.hidden.md`, "content");
      yield* fs.writeFileString(`${testDir}/.hidden/impl.md`, "content");

      const result = yield* scanCommandFilesRecursively(testDir);

      expect(result).toHaveLength(1);
      expect(result).toContain("visible");
      expect(result).not.toContain(".hidden");
      expect(result).not.toContain(".hidden:impl");
    }).pipe(Effect.provide(testLayer)),
  );

  it.live("should only include .md files", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      yield* fs.makeDirectory(testDir, { recursive: true });
      yield* fs.writeFileString(`${testDir}/command.md`, "content");
      yield* fs.writeFileString(`${testDir}/readme.txt`, "content");
      yield* fs.writeFileString(`${testDir}/config.json`, "content");

      const result = yield* scanCommandFilesRecursively(testDir);

      expect(result).toHaveLength(1);
      expect(result).toContain("command");
    }).pipe(Effect.provide(testLayer)),
  );
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

  it.live("should scan flat skill directory structure", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      yield* fs.makeDirectory(`${testDir}/typescript`, { recursive: true });
      yield* fs.makeDirectory(`${testDir}/react`, { recursive: true });
      yield* fs.writeFileString(`${testDir}/typescript/SKILL.md`, "content");
      yield* fs.writeFileString(`${testDir}/react/SKILL.md`, "content");

      const result = yield* scanSkillFilesRecursively(testDir);

      expect(result).toHaveLength(2);
      expect(result).toContain("typescript");
      expect(result).toContain("react");
    }).pipe(Effect.provide(testLayer)),
  );

  it.live("should scan nested skill directory structure", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      yield* fs.makeDirectory(`${testDir}/typescript`, { recursive: true });
      yield* fs.makeDirectory(`${testDir}/frontend/design`, {
        recursive: true,
      });
      yield* fs.writeFileString(`${testDir}/typescript/SKILL.md`, "content");
      yield* fs.writeFileString(`${testDir}/frontend/design/SKILL.md`, "content");

      const result = yield* scanSkillFilesRecursively(testDir);

      expect(result).toHaveLength(2);
      expect(result).toContain("typescript");
      expect(result).toContain("frontend:design");
    }).pipe(Effect.provide(testLayer)),
  );

  it.live("should scan deeply nested skill directories", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      yield* fs.makeDirectory(`${testDir}/a/b/c`, { recursive: true });
      yield* fs.writeFileString(`${testDir}/a/b/c/SKILL.md`, "content");

      const result = yield* scanSkillFilesRecursively(testDir);

      expect(result).toHaveLength(1);
      expect(result).toContain("a:b:c");
    }).pipe(Effect.provide(testLayer)),
  );

  it.live("should return empty array for non-existent directory", () =>
    Effect.gen(function* () {
      const nonExistentDir = `${testDir}/non-existent`;

      const result = yield* scanSkillFilesRecursively(nonExistentDir);

      expect(result).toEqual([]);
    }).pipe(Effect.provide(testLayer)),
  );

  it.live("should exclude hidden files and directories", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      yield* fs.makeDirectory(`${testDir}/visible`, { recursive: true });
      yield* fs.makeDirectory(`${testDir}/.hidden`, { recursive: true });
      yield* fs.writeFileString(`${testDir}/visible/SKILL.md`, "content");
      yield* fs.writeFileString(`${testDir}/.hidden/SKILL.md`, "content");

      const result = yield* scanSkillFilesRecursively(testDir);

      expect(result).toHaveLength(1);
      expect(result).toContain("visible");
      expect(result).not.toContain(".hidden");
    }).pipe(Effect.provide(testLayer)),
  );

  it.live("should only detect directories with SKILL.md", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      yield* fs.makeDirectory(`${testDir}/with-skill`, { recursive: true });
      yield* fs.makeDirectory(`${testDir}/without-skill`, {
        recursive: true,
      });
      yield* fs.writeFileString(`${testDir}/with-skill/SKILL.md`, "content");
      yield* fs.writeFileString(`${testDir}/without-skill/README.md`, "content");

      const result = yield* scanSkillFilesRecursively(testDir);

      expect(result).toHaveLength(1);
      expect(result).toContain("with-skill");
      expect(result).not.toContain("without-skill");
    }).pipe(Effect.provide(testLayer)),
  );

  it.live("should handle mixed nested structures", () =>
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
      yield* fs.writeFileString(`${testDir}/parent/skill2/SKILL.md`, "content");
      yield* fs.writeFileString(`${testDir}/parent/child/skill3/SKILL.md`, "content");

      const result = yield* scanSkillFilesRecursively(testDir);

      expect(result).toHaveLength(3);
      expect(result).toContain("skill1");
      expect(result).toContain("parent:skill2");
      expect(result).toContain("parent:child:skill3");
    }).pipe(Effect.provide(testLayer)),
  );
});
