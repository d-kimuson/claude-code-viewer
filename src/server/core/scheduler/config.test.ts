import { mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileSystem, Path } from "@effect/platform";
import { NodeFileSystem, NodePath } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import {
  getConfigPath,
  initializeConfig,
  readConfig,
  SchedulerConfigBaseDir,
  writeConfig,
} from "./config";
import type { SchedulerConfig } from "./schema";

describe("scheduler config", () => {
  let testDir: string;
  let testLayer: Layer.Layer<
    FileSystem.FileSystem | Path.Path | SchedulerConfigBaseDir
  >;

  beforeEach(async () => {
    testDir = join(tmpdir(), `scheduler-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });

    // Use test directory as base for config files
    const testConfigBaseDir = Layer.succeed(SchedulerConfigBaseDir, testDir);

    testLayer = Layer.mergeAll(
      NodeFileSystem.layer,
      NodePath.layer,
      testConfigBaseDir,
    );
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  test("getConfigPath returns correct path", async () => {
    const result = await Effect.runPromise(
      getConfigPath.pipe(Effect.provide(testLayer)),
    );

    expect(result).toContain("/scheduler/schedules.json");
    expect(result).toContain(testDir);
  });

  test("writeConfig and readConfig work correctly", async () => {
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

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        yield* writeConfig(config);
        return yield* readConfig;
      }).pipe(Effect.provide(testLayer)),
    );

    expect(result).toEqual(config);
  });

  test("initializeConfig creates file if not exists", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const configPath = yield* getConfigPath;
        const fs = yield* FileSystem.FileSystem;

        const exists = yield* fs.exists(configPath);
        if (exists) {
          yield* fs.remove(configPath);
        }

        return yield* initializeConfig;
      }).pipe(Effect.provide(testLayer)),
    );

    expect(result).toEqual({ jobs: [] });
  });

  test("readConfig fails with ConfigFileNotFoundError when file does not exist", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const configPath = yield* getConfigPath;

        const exists = yield* fs.exists(configPath);
        if (exists) {
          yield* fs.remove(configPath);
        }

        return yield* readConfig;
      }).pipe(Effect.provide(testLayer), Effect.flip),
    );

    expect(result._tag).toBe("ConfigFileNotFoundError");
  });

  test("readConfig fails with ConfigParseError for invalid JSON", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = yield* Path.Path;
        const configPath = yield* getConfigPath;
        const configDir = path.dirname(configPath);

        yield* fs.makeDirectory(configDir, { recursive: true });
        yield* fs.writeFileString(configPath, "{ invalid json }");

        return yield* readConfig;
      }).pipe(Effect.provide(testLayer), Effect.flip),
    );

    expect(result._tag).toBe("ConfigParseError");
  });
});
