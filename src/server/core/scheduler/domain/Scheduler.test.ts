/* oxlint-disable typescript-eslint/no-unsafe-type-assertion -- test mocks use `as never` for partial implementations */
import { mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NodeContext, NodeFileSystem, NodePath } from "@effect/platform-node";
import { it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { afterEach, beforeEach, describe, expect } from "vitest";
import { DEFAULT_LOCALE } from "../../../../lib/i18n/localeDetection.ts";
import { ClaudeCodeLifeCycleService } from "../../claude-code/services/ClaudeCodeLifeCycleService.ts";
import { ClaudeCodeSessionProcessService } from "../../claude-code/services/ClaudeCodeSessionProcessService.ts";
import { EventBus } from "../../events/services/EventBus.ts";
import { EnvService } from "../../platform/services/EnvService.ts";
import { UserConfigService } from "../../platform/services/UserConfigService.ts";
import { ProjectRepository } from "../../project/infrastructure/ProjectRepository.ts";
import { SchedulerConfigBaseDir } from "../config.ts";
import type { NewSchedulerJob } from "../schema.ts";
import { SchedulerService } from "./Scheduler.ts";

describe("SchedulerService", () => {
  let testDir: string;

  const mockSessionProcessService = Layer.succeed(ClaudeCodeSessionProcessService, {
    startSessionProcess: () => Effect.succeed({ sessionProcess: {} as never, task: {} as never }),
    continueSessionProcess: () =>
      Effect.succeed({ sessionProcess: {} as never, task: {} as never }),
    updateRawUserMessage: () => Effect.succeed({ sessionProcess: {} as never }),
    toInitializedState: () => Effect.succeed({ sessionProcess: {} as never }),
    toFileCreatedState: () => Effect.succeed({ sessionProcess: {} as never }),
    toPausedState: () => Effect.succeed({ sessionProcess: {} as never }),
    toCompletedState: () => Effect.succeed({ sessionProcess: {} as never, task: undefined }),
    dangerouslyChangeProcessState: () => Effect.succeed({} as never),
    getSessionProcesses: () => Effect.succeed([]),
    getSessionProcess: () => Effect.succeed({} as never),
    getTask: () => Effect.succeed({} as never),
    changeTurnState: () => Effect.succeed({} as never),
  });

  const mockLifeCycleService = Layer.succeed(ClaudeCodeLifeCycleService, {
    startTask: () => Effect.void,
    continueTask: () => Effect.void,
  } as never);

  const mockProjectRepository = Layer.succeed(ProjectRepository, {
    getProject: () =>
      Effect.succeed({
        project: {
          meta: { projectPath: "/tmp/test-project" },
        },
      } as never),
  } as never);

  const mockUserConfigService = Layer.succeed(UserConfigService, {
    getUserConfig: () =>
      Effect.succeed({
        hideNoUserMessageSession: true,
        unifySameTitleSession: true,
        enterKeyBehavior: "shift-enter-send",
        permissionMode: "default",
        locale: DEFAULT_LOCALE,
      }),
  } as never);

  const mockEnvService = Layer.succeed(EnvService, {
    getEnv: () => Effect.succeed(undefined),
  } as never);

  let testConfigBaseDir: Layer.Layer<SchedulerConfigBaseDir>;
  let testLayer: Layer.Layer<
    // oxlint-disable-next-line typescript-eslint/consistent-type-imports -- type-only import() needed for Layer type parameter
    | import("@effect/platform").FileSystem.FileSystem
    // oxlint-disable-next-line typescript-eslint/consistent-type-imports -- type-only import() needed for Layer type parameter
    | import("@effect/platform").Path.Path
    // oxlint-disable-next-line typescript-eslint/consistent-type-imports -- type-only import() needed for Layer type parameter
    | import("@effect/platform-node").NodeContext.NodeContext
    | ClaudeCodeSessionProcessService
    | ClaudeCodeLifeCycleService
    | ProjectRepository
    | UserConfigService
    | EnvService
    | SchedulerConfigBaseDir
    | SchedulerService
  >;

  beforeEach(async () => {
    testDir = join(tmpdir(), `scheduler-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });

    // Use test directory as base for config files
    testConfigBaseDir = Layer.succeed(SchedulerConfigBaseDir, testDir);

    const baseLayers = Layer.mergeAll(
      NodeFileSystem.layer,
      NodePath.layer,
      NodeContext.layer,
      EventBus.Live,
      mockSessionProcessService,
      mockLifeCycleService,
      mockProjectRepository,
      mockUserConfigService,
      mockEnvService,
      testConfigBaseDir,
    );

    testLayer = SchedulerService.Live.pipe(Layer.provideMerge(baseLayers));
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it.live("addJob creates a new job with generated id", () =>
    Effect.gen(function* () {
      const newJob: NewSchedulerJob = {
        name: "Test Job",
        schedule: {
          type: "cron",
          expression: "0 0 * * *",
          concurrencyPolicy: "skip",
        },
        message: {
          content: "test message",
          projectId: "project-1",
          sessionId: "00000000-0000-4000-8000-000000000001",
          resume: false,
        },
        enabled: false,
      };

      const service = yield* SchedulerService;
      const result = yield* service.addJob(newJob);

      expect(result.id).toBeDefined();
      expect(result.name).toBe("Test Job");
      expect(result.createdAt).toBeDefined();
      expect(result.lastRunAt).toBe(null);
      expect(result.lastRunStatus).toBe(null);
    }).pipe(Effect.provide(testLayer)),
  );

  it.live("getJobs returns all jobs", () =>
    Effect.gen(function* () {
      const newJob: NewSchedulerJob = {
        name: "Test Job",
        schedule: {
          type: "cron",
          expression: "0 0 * * *",
          concurrencyPolicy: "skip",
        },
        message: {
          content: "test message",
          projectId: "project-1",
          sessionId: "00000000-0000-4000-8000-000000000001",
          resume: false,
        },
        enabled: false,
      };

      const service = yield* SchedulerService;
      yield* service.addJob(newJob);
      yield* service.addJob(newJob);
      const result = yield* service.getJobs();

      expect(result).toHaveLength(2);
    }).pipe(Effect.provide(testLayer)),
  );

  it.live("updateJob modifies an existing job", () =>
    Effect.gen(function* () {
      const newJob: NewSchedulerJob = {
        name: "Test Job",
        schedule: {
          type: "cron",
          expression: "0 0 * * *",
          concurrencyPolicy: "skip",
        },
        message: {
          content: "test message",
          projectId: "project-1",
          sessionId: "00000000-0000-4000-8000-000000000001",
          resume: false,
        },
        enabled: false,
      };

      const service = yield* SchedulerService;
      const job = yield* service.addJob(newJob);
      const result = yield* service.updateJob(job.id, {
        name: "Updated Job",
      });

      expect(result.name).toBe("Updated Job");
    }).pipe(Effect.provide(testLayer)),
  );

  it.live("deleteJob removes a job", () =>
    Effect.gen(function* () {
      const newJob: NewSchedulerJob = {
        name: "Test Job",
        schedule: {
          type: "cron",
          expression: "0 0 * * *",
          concurrencyPolicy: "skip",
        },
        message: {
          content: "test message",
          projectId: "project-1",
          sessionId: "00000000-0000-4000-8000-000000000001",
          resume: false,
        },
        enabled: false,
      };

      const service = yield* SchedulerService;
      const job = yield* service.addJob(newJob);
      yield* service.deleteJob(job.id);
      const result = yield* service.getJobs();

      expect(result).toHaveLength(0);
    }).pipe(Effect.provide(testLayer)),
  );

  it.live("updateJob fails with SchedulerJobNotFoundError for non-existent job", () =>
    Effect.gen(function* () {
      const service = yield* SchedulerService;
      const result = yield* service
        .updateJob("non-existent-id", { name: "Updated" })
        .pipe(Effect.flip);

      expect(result._tag).toBe("SchedulerJobNotFoundError");
    }).pipe(Effect.provide(testLayer)),
  );

  it.live("deleteJob fails with SchedulerJobNotFoundError for non-existent job", () =>
    Effect.gen(function* () {
      const service = yield* SchedulerService;
      const result = yield* service.deleteJob("non-existent-id").pipe(Effect.flip);

      expect(result._tag).toBe("SchedulerJobNotFoundError");
    }).pipe(Effect.provide(testLayer)),
  );
});
