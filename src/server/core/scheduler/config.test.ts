import { mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileSystem, Path } from "@effect/platform";
import { NodeFileSystem, NodePath } from "@effect/platform-node";
import { it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { afterEach, beforeEach, describe, expect } from "vitest";
import {
  getConfigPath,
  initializeConfig,
  readConfig,
  SchedulerConfigBaseDir,
  writeConfig,
} from "./config.ts";
import type { SchedulerConfig } from "./schema.ts";

describe("scheduler config", () => {
  let testDir: string;
  let testLayer: Layer.Layer<FileSystem.FileSystem | Path.Path | SchedulerConfigBaseDir>;

  beforeEach(async () => {
    testDir = join(tmpdir(), `scheduler-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });

    // Use test directory as base for config files
    const testConfigBaseDir = Layer.succeed(SchedulerConfigBaseDir, testDir);

    testLayer = Layer.mergeAll(NodeFileSystem.layer, NodePath.layer, testConfigBaseDir);
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it.live("getConfigPath returns correct path", () =>
    Effect.gen(function* () {
      const result = yield* getConfigPath;

      expect(result).toContain("/scheduler/schedules.json");
      expect(result).toContain(testDir);
    }).pipe(Effect.provide(testLayer)),
  );

  it.live("writeConfig and readConfig work correctly", () =>
    Effect.gen(function* () {
      const config: SchedulerConfig = {
        jobs: [
          {
            id: "test-job-1",
            name: "Test Job",
            schedule: {
              type: "cron",
              expression: "0 0 * * *",
              concurrencyPolicy: "skip",
            },
            message: {
              content: "test message",
              projectId: "project-1",
              baseSession: null,
            },
            enabled: true,
            createdAt: "2025-10-25T00:00:00Z",
            lastRunAt: null,
            lastRunStatus: null,
          },
        ],
      };

      yield* writeConfig(config);
      const result = yield* readConfig;

      expect(result).toEqual(config);
    }).pipe(Effect.provide(testLayer)),
  );

  it.live("initializeConfig creates file if not exists", () =>
    Effect.gen(function* () {
      const configPath = yield* getConfigPath;
      const fs = yield* FileSystem.FileSystem;

      const exists = yield* fs.exists(configPath);
      if (exists) {
        yield* fs.remove(configPath);
      }

      const result = yield* initializeConfig;

      expect(result).toEqual({ jobs: [] });
    }).pipe(Effect.provide(testLayer)),
  );

  it.live("readConfig fails with ConfigFileNotFoundError when file does not exist", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const configPath = yield* getConfigPath;

      const exists = yield* fs.exists(configPath);
      if (exists) {
        yield* fs.remove(configPath);
      }

      const result = yield* readConfig.pipe(Effect.flip);

      expect(result._tag).toBe("ConfigFileNotFoundError");
    }).pipe(Effect.provide(testLayer)),
  );

  it.live("readConfig fails with ConfigParseError for invalid JSON", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const configPath = yield* getConfigPath;
      const configDir = path.dirname(configPath);

      yield* fs.makeDirectory(configDir, { recursive: true });
      yield* fs.writeFileString(configPath, "{ invalid json }");

      const result = yield* readConfig.pipe(Effect.flip);

      expect(result._tag).toBe("ConfigParseError");
    }).pipe(Effect.provide(testLayer)),
  );
});
