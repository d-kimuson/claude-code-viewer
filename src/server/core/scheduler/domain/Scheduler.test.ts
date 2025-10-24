import { mkdir, rm, unlink } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { NodeContext, NodeFileSystem, NodePath } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { ClaudeCodeLifeCycleService } from "../../claude-code/services/ClaudeCodeLifeCycleService";
import { ClaudeCodeSessionProcessService } from "../../claude-code/services/ClaudeCodeSessionProcessService";
import { EnvService } from "../../platform/services/EnvService";
import { UserConfigService } from "../../platform/services/UserConfigService";
import { ProjectRepository } from "../../project/infrastructure/ProjectRepository";
import type { NewSchedulerJob } from "../schema";
import { SchedulerService } from "./Scheduler";

describe("SchedulerService", () => {
  let testDir: string;

  const mockSessionProcessService = Layer.succeed(
    ClaudeCodeSessionProcessService,
    {
      startSessionProcess: () =>
        Effect.succeed({ sessionProcess: {} as never, task: {} as never }),
      continueSessionProcess: () =>
        Effect.succeed({ sessionProcess: {} as never, task: {} as never }),
      toNotInitializedState: () =>
        Effect.succeed({ sessionProcess: {} as never, task: {} as never }),
      toInitializedState: () => Effect.succeed({ sessionProcess: {} as never }),
      toFileCreatedState: () => Effect.succeed({ sessionProcess: {} as never }),
      toPausedState: () => Effect.succeed({ sessionProcess: {} as never }),
      toCompletedState: () =>
        Effect.succeed({ sessionProcess: {} as never, task: undefined }),
      dangerouslyChangeProcessState: () => Effect.succeed({} as never),
      getSessionProcesses: () => Effect.succeed([]),
      getSessionProcess: () => Effect.succeed({} as never),
      getTask: () => Effect.succeed({} as never),
      changeTaskState: () => Effect.succeed({} as never),
    },
  );

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
        locale: "ja",
      }),
  } as never);

  const mockEnvService = Layer.succeed(EnvService, {
    getEnv: () => Effect.succeed(undefined),
  } as never);

  const baseLayers = Layer.mergeAll(
    NodeFileSystem.layer,
    NodePath.layer,
    NodeContext.layer,
    mockSessionProcessService,
    mockLifeCycleService,
    mockProjectRepository,
    mockUserConfigService,
    mockEnvService,
  );

  const testLayer = Layer.mergeAll(SchedulerService.Live, baseLayers).pipe(
    Layer.provide(baseLayers),
  );

  beforeEach(async () => {
    testDir = join(tmpdir(), `scheduler-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });

    // Clean up existing config file
    const configPath = join(
      homedir(),
      ".claude-code-viewer",
      "scheduler",
      "config.json",
    );
    try {
      await unlink(configPath);
    } catch {
      // Ignore if file doesn't exist
    }
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  test("addJob creates a new job with generated id", async () => {
    const newJob: NewSchedulerJob = {
      name: "Test Job",
      schedule: { type: "cron", expression: "0 0 * * *" },
      message: {
        content: "test message",
        projectId: "project-1",
        baseSessionId: null,
      },
      enabled: false,
      concurrencyPolicy: "skip",
    };

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* SchedulerService;
        const job = yield* service.addJob(newJob);
        return job;
      }).pipe(Effect.provide(testLayer)),
    );

    expect(result.id).toBeDefined();
    expect(result.name).toBe("Test Job");
    expect(result.createdAt).toBeDefined();
    expect(result.lastRunAt).toBe(null);
    expect(result.lastRunStatus).toBe(null);
  });

  test("getJobs returns all jobs", async () => {
    const newJob: NewSchedulerJob = {
      name: "Test Job",
      schedule: { type: "cron", expression: "0 0 * * *" },
      message: {
        content: "test message",
        projectId: "project-1",
        baseSessionId: null,
      },
      enabled: false,
      concurrencyPolicy: "skip",
    };

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* SchedulerService;
        yield* service.addJob(newJob);
        yield* service.addJob(newJob);
        return yield* service.getJobs();
      }).pipe(Effect.provide(testLayer)),
    );

    expect(result).toHaveLength(2);
  });

  test("updateJob modifies an existing job", async () => {
    const newJob: NewSchedulerJob = {
      name: "Test Job",
      schedule: { type: "cron", expression: "0 0 * * *" },
      message: {
        content: "test message",
        projectId: "project-1",
        baseSessionId: null,
      },
      enabled: false,
      concurrencyPolicy: "skip",
    };

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* SchedulerService;
        const job = yield* service.addJob(newJob);
        const updated = yield* service.updateJob(job.id, {
          name: "Updated Job",
        });
        return updated;
      }).pipe(Effect.provide(testLayer)),
    );

    expect(result.name).toBe("Updated Job");
  });

  test("deleteJob removes a job", async () => {
    const newJob: NewSchedulerJob = {
      name: "Test Job",
      schedule: { type: "cron", expression: "0 0 * * *" },
      message: {
        content: "test message",
        projectId: "project-1",
        baseSessionId: null,
      },
      enabled: false,
      concurrencyPolicy: "skip",
    };

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* SchedulerService;
        const job = yield* service.addJob(newJob);
        yield* service.deleteJob(job.id);
        return yield* service.getJobs();
      }).pipe(Effect.provide(testLayer)),
    );

    expect(result).toHaveLength(0);
  });

  test("updateJob fails with SchedulerJobNotFoundError for non-existent job", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* SchedulerService;
        return yield* service.updateJob("non-existent-id", { name: "Updated" });
      }).pipe(Effect.provide(testLayer), Effect.flip),
    );

    expect(result._tag).toBe("SchedulerJobNotFoundError");
  });

  test("deleteJob fails with SchedulerJobNotFoundError for non-existent job", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* SchedulerService;
        return yield* service.deleteJob("non-existent-id");
      }).pipe(Effect.provide(testLayer), Effect.flip),
    );

    expect(result._tag).toBe("SchedulerJobNotFoundError");
  });
});
