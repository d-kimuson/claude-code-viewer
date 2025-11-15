import { mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NodeContext, NodeFileSystem, NodePath } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { afterEach, beforeEach, expect, test } from "vitest";
import { testPlatformLayer } from "@/testing/layers";
import { ClaudeCodeLifeCycleService } from "../../claude-code/services/ClaudeCodeLifeCycleService";
import { ClaudeCodeSessionProcessService } from "../../claude-code/services/ClaudeCodeSessionProcessService";
import { ProjectRepository } from "../../project/infrastructure/ProjectRepository";
import { SchedulerConfigBaseDir } from "../../scheduler/config";
import { SchedulerService } from "../../scheduler/domain/Scheduler";
import { createRateLimitResumeJob } from "./createRateLimitResumeJob";

let testDir: string;
let testLayer: Layer.Layer<
  | import("@effect/platform").FileSystem.FileSystem
  | import("@effect/platform").Path.Path
  | import("@effect/platform-node").NodeContext.NodeContext
  | ClaudeCodeSessionProcessService
  | ClaudeCodeLifeCycleService
  | ProjectRepository
  | import("../../platform/services/UserConfigService").UserConfigService
  | import("../../platform/services/EnvService").EnvService
  | SchedulerConfigBaseDir
  | SchedulerService
>;

beforeEach(async () => {
  testDir = join(tmpdir(), `create-rate-limit-test-${Date.now()}`);
  await mkdir(testDir, { recursive: true });

  const testConfigBaseDir = Layer.succeed(SchedulerConfigBaseDir, testDir);

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

  const baseLayers = Layer.mergeAll(
    NodeFileSystem.layer,
    NodePath.layer,
    NodeContext.layer,
    mockSessionProcessService,
    mockLifeCycleService,
    mockProjectRepository,
    testConfigBaseDir,
    testPlatformLayer(),
  );

  testLayer = Layer.mergeAll(SchedulerService.Live, baseLayers).pipe(
    Layer.provideMerge(baseLayers),
  );
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

test("createRateLimitResumeJob should return null when autoResumeOnRateLimit is disabled", async () => {
  const entry = {
    type: "assistant" as const,
    isApiErrorMessage: true,
    message: {
      content: [
        { type: "text" as const, text: "Session limit reached ∙ resets 7pm" },
      ],
    },
  };

  const result = await Effect.runPromise(
    createRateLimitResumeJob({
      entry,
      sessionId: "test-session-id",
      projectId: "test-project-id",
      autoResumeEnabled: false,
    }).pipe(Effect.provide(testLayer)),
  );

  expect(result).toBeNull();
});

test("createRateLimitResumeJob should return null when entry is not a rate limit message", async () => {
  const entry = {
    type: "assistant" as const,
    message: {
      content: [{ type: "text" as const, text: "Hello" }],
    },
  };

  const result = await Effect.runPromise(
    createRateLimitResumeJob({
      entry,
      sessionId: "test-session-id",
      projectId: "test-project-id",
      autoResumeEnabled: true,
    }).pipe(Effect.provide(testLayer)),
  );

  expect(result).toBeNull();
});

test("createRateLimitResumeJob should return null when reset time parsing fails", async () => {
  const entry = {
    type: "assistant" as const,
    isApiErrorMessage: true,
    message: {
      content: [
        {
          type: "text" as const,
          text: "Session limit reached ∙ resets invalid",
        },
      ],
    },
  };

  const result = await Effect.runPromise(
    createRateLimitResumeJob({
      entry,
      sessionId: "test-session-id",
      projectId: "test-project-id",
      autoResumeEnabled: true,
    }).pipe(Effect.provide(testLayer)),
  );

  expect(result).toBeNull();
});

test("createRateLimitResumeJob should create a reserved schedule job", async () => {
  const entry = {
    type: "assistant" as const,
    isApiErrorMessage: true,
    message: {
      content: [
        { type: "text" as const, text: "Session limit reached ∙ resets 7pm" },
      ],
    },
  };

  const result = await Effect.runPromise(
    createRateLimitResumeJob({
      entry,
      sessionId: "test-session-id",
      projectId: "test-project-id",
      autoResumeEnabled: true,
    }).pipe(Effect.provide(testLayer)),
  );

  expect(result).not.toBeNull();
  if (result) {
    expect(result.name).toContain("Auto-resume");
    expect(result.name).toContain("test-session-id");
    expect(result.schedule.type).toBe("reserved");
    expect(result.message.content).toBe("continue");
    expect(result.message.projectId).toBe("test-project-id");
    expect(result.message.baseSessionId).toBe("test-session-id");
    expect(result.enabled).toBe(true);

    // Verify the schedule time is set correctly (should be around 7:01pm)
    if (result.schedule.type === "reserved") {
      const resumeTime = new Date(result.schedule.reservedExecutionTime);
      expect(resumeTime.getUTCHours()).toBe(19);
      expect(resumeTime.getUTCMinutes()).toBe(1);
    }
  }
});

test("createRateLimitResumeJob should handle different reset times", async () => {
  const testCases = [
    { text: "Session limit reached ∙ resets 5am", expectedHour: 5 },
    { text: "Session limit reached ∙ resets 11pm", expectedHour: 23 },
    { text: "Session limit reached ∙ resets 12am", expectedHour: 0 },
  ];

  for (const { text, expectedHour } of testCases) {
    const entry = {
      type: "assistant" as const,
      isApiErrorMessage: true,
      message: {
        content: [{ type: "text" as const, text }],
      },
    };

    const result = await Effect.runPromise(
      createRateLimitResumeJob({
        entry,
        sessionId: "test-session-id",
        projectId: "test-project-id",
        autoResumeEnabled: true,
      }).pipe(Effect.provide(testLayer)),
    );

    expect(result).not.toBeNull();
    if (result && result.schedule.type === "reserved") {
      const resumeTime = new Date(result.schedule.reservedExecutionTime);
      expect(resumeTime.getUTCHours()).toBe(expectedHour);
      expect(resumeTime.getUTCMinutes()).toBe(1);
    }
  }
});

test("createRateLimitResumeJob should update existing job if one exists", async () => {
  const entry = {
    type: "assistant" as const,
    isApiErrorMessage: true,
    message: {
      content: [
        { type: "text" as const, text: "Session limit reached ∙ resets 7pm" },
      ],
    },
  };

  // Create first job
  const firstResult = await Effect.runPromise(
    createRateLimitResumeJob({
      entry,
      sessionId: "test-session-id",
      projectId: "test-project-id",
      autoResumeEnabled: true,
    }).pipe(Effect.provide(testLayer)),
  );

  expect(firstResult).not.toBeNull();

  // Create second job with same session (should update existing)
  const secondEntry = {
    type: "assistant" as const,
    isApiErrorMessage: true,
    message: {
      content: [
        { type: "text" as const, text: "Session limit reached ∙ resets 9pm" },
      ],
    },
  };

  const secondResult = await Effect.runPromise(
    createRateLimitResumeJob({
      entry: secondEntry,
      sessionId: "test-session-id",
      projectId: "test-project-id",
      autoResumeEnabled: true,
    }).pipe(Effect.provide(testLayer)),
  );

  expect(secondResult).not.toBeNull();

  // Verify that only one job exists
  const jobs = await Effect.runPromise(
    Effect.gen(function* () {
      const scheduler = yield* SchedulerService;
      return yield* scheduler.getJobs();
    }).pipe(Effect.provide(testLayer)),
  );

  const rateLimitJobs = jobs.filter((job) =>
    job.name.includes("test-session-id"),
  );
  expect(rateLimitJobs.length).toBe(1);

  // Verify the job has the updated time (9pm + 1min = 21:01)
  if (
    rateLimitJobs[0] !== undefined &&
    rateLimitJobs[0].schedule.type === "reserved"
  ) {
    const resumeTime = new Date(
      rateLimitJobs[0].schedule.reservedExecutionTime,
    );
    expect(resumeTime.getUTCHours()).toBe(21);
    expect(resumeTime.getUTCMinutes()).toBe(1);
  }
});
