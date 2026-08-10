import { FileSystem } from "@effect/platform";
import { NodeFileSystem } from "@effect/platform-node";
import { it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { afterEach, beforeEach, describe, expect } from "vitest";
import { testPlatformLayer } from "../../../../testing/layers/testPlatformLayer.ts";
import { ProjectRepository } from "../../project/infrastructure/ProjectRepository.ts";
import { ClaudeCodeService } from "./ClaudeCodeService.ts";

describe("ClaudeCodeService.getUserDefaultPermissionMode", () => {
  let testDir: string;

  const buildTestLayer = () => {
    const applicationContextLayer = testPlatformLayer({
      claudeCodePaths: { globalClaudeDirectoryPath: testDir },
    });
    const projectRepositoryLayer = Layer.mock(ProjectRepository, {});
    const dependencies = Layer.mergeAll(
      applicationContextLayer,
      NodeFileSystem.layer,
      projectRepositoryLayer,
    );

    return Layer.mergeAll(
      NodeFileSystem.layer,
      Layer.provide(ClaudeCodeService.Live, dependencies),
    );
  };

  beforeEach(async () => {
    testDir = await Effect.runPromise(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        return yield* fs.makeTempDirectory();
      }).pipe(Effect.provide(NodeFileSystem.layer)),
    );
  });

  afterEach(async () => {
    await Effect.runPromise(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        yield* fs.remove(testDir, { recursive: true, force: true });
      }).pipe(Effect.provide(NodeFileSystem.layer)),
    );
  });

  it.live("returns undefined when settings.json does not exist", () =>
    Effect.gen(function* () {
      const service = yield* ClaudeCodeService;
      const result = yield* service.getUserDefaultPermissionMode;
      expect(result).toBeUndefined();
    }).pipe(Effect.provide(buildTestLayer())),
  );

  it.live("returns the configured defaultMode from settings.json", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      yield* fs.writeFileString(
        `${testDir}/settings.json`,
        JSON.stringify({ permissions: { defaultMode: "bypassPermissions" } }),
      );

      const service = yield* ClaudeCodeService;
      const result = yield* service.getUserDefaultPermissionMode;
      expect(result).toBe("bypassPermissions");
    }).pipe(Effect.provide(buildTestLayer())),
  );

  it.live("returns undefined when settings.json is malformed", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      yield* fs.writeFileString(`${testDir}/settings.json`, "{not valid json");

      const service = yield* ClaudeCodeService;
      const result = yield* service.getUserDefaultPermissionMode;
      expect(result).toBeUndefined();
    }).pipe(Effect.provide(buildTestLayer())),
  );
});
