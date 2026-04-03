import { mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileSystem, type Path } from "@effect/platform";
import { NodeFileSystem, NodePath } from "@effect/platform-node";
import { it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { afterEach, beforeEach, describe, expect } from "vitest";
import { ProjectSettingsService } from "./ProjectSettingsService.ts";

describe("ProjectSettingsService", () => {
  let testDir: string;
  let testLayer: Layer.Layer<ProjectSettingsService | FileSystem.FileSystem | Path.Path>;

  beforeEach(async () => {
    testDir = join(tmpdir(), `project-settings-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });

    const fsAndPath = Layer.mergeAll(NodeFileSystem.layer, NodePath.layer);
    testLayer = Layer.mergeAll(fsAndPath, Layer.provide(ProjectSettingsService.Live, fsAndPath));
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it.live("creates settings.local.json with correct structure when file doesn't exist", () =>
    Effect.gen(function* () {
      const service = yield* ProjectSettingsService;
      const fs = yield* FileSystem.FileSystem;

      yield* service.addProjectPermissionRule(testDir, "Bash(*)");

      const content = yield* fs.readFileString(join(testDir, ".claude", "settings.local.json"));
      const parsed: unknown = JSON.parse(content);

      expect(parsed).toEqual({
        permissions: {
          allow: ["Bash(*)"],
        },
      });
    }).pipe(Effect.provide(testLayer)),
  );

  it.live("appends rule to existing permissions.allow array", () =>
    Effect.gen(function* () {
      const service = yield* ProjectSettingsService;
      const fs = yield* FileSystem.FileSystem;

      const claudeDir = join(testDir, ".claude");
      yield* fs.makeDirectory(claudeDir, { recursive: true });
      yield* fs.writeFileString(
        join(claudeDir, "settings.local.json"),
        JSON.stringify({ permissions: { allow: ["Read(*)"] } }, null, 2),
      );

      yield* service.addProjectPermissionRule(testDir, "Bash(*)");

      const content = yield* fs.readFileString(join(claudeDir, "settings.local.json"));
      const parsed: unknown = JSON.parse(content);

      expect(parsed).toEqual({
        permissions: {
          allow: ["Read(*)", "Bash(*)"],
        },
      });
    }).pipe(Effect.provide(testLayer)),
  );

  it.live("does not add duplicate rules", () =>
    Effect.gen(function* () {
      const service = yield* ProjectSettingsService;
      const fs = yield* FileSystem.FileSystem;

      const claudeDir = join(testDir, ".claude");
      yield* fs.makeDirectory(claudeDir, { recursive: true });
      yield* fs.writeFileString(
        join(claudeDir, "settings.local.json"),
        JSON.stringify({ permissions: { allow: ["Bash(*)"] } }, null, 2),
      );

      yield* service.addProjectPermissionRule(testDir, "Bash(*)");

      const content = yield* fs.readFileString(join(claudeDir, "settings.local.json"));
      const parsed: unknown = JSON.parse(content);

      expect(parsed).toEqual({
        permissions: {
          allow: ["Bash(*)"],
        },
      });
    }).pipe(Effect.provide(testLayer)),
  );

  it.live("handles existing file without permissions key", () =>
    Effect.gen(function* () {
      const service = yield* ProjectSettingsService;
      const fs = yield* FileSystem.FileSystem;

      const claudeDir = join(testDir, ".claude");
      yield* fs.makeDirectory(claudeDir, { recursive: true });
      yield* fs.writeFileString(
        join(claudeDir, "settings.local.json"),
        JSON.stringify({ someOtherKey: "value" }, null, 2),
      );

      yield* service.addProjectPermissionRule(testDir, "Edit(*)");

      const content = yield* fs.readFileString(join(claudeDir, "settings.local.json"));
      const parsed: unknown = JSON.parse(content);

      expect(parsed).toEqual({
        someOtherKey: "value",
        permissions: {
          allow: ["Edit(*)"],
        },
      });
    }).pipe(Effect.provide(testLayer)),
  );

  it.live("handles existing file with permissions but no allow key", () =>
    Effect.gen(function* () {
      const service = yield* ProjectSettingsService;
      const fs = yield* FileSystem.FileSystem;

      const claudeDir = join(testDir, ".claude");
      yield* fs.makeDirectory(claudeDir, { recursive: true });
      yield* fs.writeFileString(
        join(claudeDir, "settings.local.json"),
        JSON.stringify({ permissions: { deny: ["Rm(*)"] } }, null, 2),
      );

      yield* service.addProjectPermissionRule(testDir, "Bash(*)");

      const content = yield* fs.readFileString(join(claudeDir, "settings.local.json"));
      const parsed: unknown = JSON.parse(content);

      expect(parsed).toEqual({
        permissions: {
          deny: ["Rm(*)"],
          allow: ["Bash(*)"],
        },
      });
    }).pipe(Effect.provide(testLayer)),
  );

  it.live("preserves other keys in the settings file", () =>
    Effect.gen(function* () {
      const service = yield* ProjectSettingsService;
      const fs = yield* FileSystem.FileSystem;

      const claudeDir = join(testDir, ".claude");
      yield* fs.makeDirectory(claudeDir, { recursive: true });
      yield* fs.writeFileString(
        join(claudeDir, "settings.local.json"),
        JSON.stringify(
          {
            model: "opus",
            permissions: {
              allow: ["Read(*)"],
              deny: ["Rm(*)"],
            },
            customSetting: true,
          },
          null,
          2,
        ),
      );

      yield* service.addProjectPermissionRule(testDir, "Bash(*)");

      const content = yield* fs.readFileString(join(claudeDir, "settings.local.json"));
      const parsed: unknown = JSON.parse(content);

      expect(parsed).toEqual({
        model: "opus",
        permissions: {
          allow: ["Read(*)", "Bash(*)"],
          deny: ["Rm(*)"],
        },
        customSetting: true,
      });
    }).pipe(Effect.provide(testLayer)),
  );
});
