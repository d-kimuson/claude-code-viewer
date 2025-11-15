import { mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NodeContext, NodeFileSystem, NodePath } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { afterEach, beforeEach, expect, test } from "vitest";
import { ClaudeCodeLifeCycleService } from "@/server/core/claude-code/services/ClaudeCodeLifeCycleService";
import { ClaudeCodeSessionProcessService } from "@/server/core/claude-code/services/ClaudeCodeSessionProcessService";
import { ProjectRepository } from "@/server/core/project/infrastructure/ProjectRepository";
import { SchedulerConfigBaseDir } from "@/server/core/scheduler/config";
import { SchedulerService } from "@/server/core/scheduler/domain/Scheduler";
import { testPlatformLayer } from "@/testing/layers";
import { createRateLimitResumeJob } from "../functions/createRateLimitResumeJob";

/**
 * E2E Test: Rate Limit Auto-Resume Feature
 *
 * This test verifies the end-to-end flow of automatic resume on rate limit:
 * 1. Rate limit message is detected in session log
 * 2. Message is correctly parsed to extract reset time
 * 3. Resume job is automatically created when conditions are met
 * 4. Proper integration with SchedulerService
 */

let testDir: string;
let testLayer: Layer.Layer<
  | import("@effect/platform").FileSystem.FileSystem
  | import("@effect/platform").Path.Path
  | import("@effect/platform-node").NodeContext.NodeContext
  | ClaudeCodeSessionProcessService
  | ClaudeCodeLifeCycleService
  | ProjectRepository
  | import("@/server/core/platform/services/UserConfigService").UserConfigService
  | import("@/server/core/platform/services/EnvService").EnvService
  | SchedulerConfigBaseDir
  | SchedulerService
>;

beforeEach(async () => {
  testDir = join(tmpdir(), `e2e-rate-limit-test-${Date.now()}`);
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
    testPlatformLayer({ userConfig: { autoResumeOnRateLimit: true } }),
  );

  testLayer = Layer.mergeAll(SchedulerService.Live, baseLayers).pipe(
    Layer.provideMerge(baseLayers),
  );
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

test("E2E: should create resume job with valid rate limit message", async () => {
  // Simple rate limit entry for E2E test
  const rateLimitEntry = {
    type: "assistant" as const,
    isApiErrorMessage: true,
    message: {
      content: [
        {
          type: "text" as const,
          text: "Session limit reached ∙ resets 7pm",
        },
      ],
    },
  };

  const projectId = "test-project-id";
  const sessionId = "test-session-id";

  // Act: Call createRateLimitResumeJob with enabled config
  const result = await Effect.runPromise(
    createRateLimitResumeJob({
      entry: rateLimitEntry,
      sessionId,
      projectId,
      autoResumeEnabled: true,
    }).pipe(Effect.provide(testLayer)),
  );

  // Assert: Job should be created
  expect(result).not.toBeNull();

  if (result) {
    expect(result.schedule.type).toBe("reserved");
    expect(result.name).toContain("Auto-resume");
    expect(result.name).toContain(sessionId);
    expect(result.message.content).toBe("continue");
    expect(result.message.projectId).toBe(projectId);
    expect(result.message.baseSessionId).toBe(sessionId);
    expect(result.enabled).toBe(true);

    // Verify scheduled time is 7:01pm (19:01)
    if (result.schedule.type === "reserved") {
      const scheduledDate = new Date(result.schedule.reservedExecutionTime);
      expect(scheduledDate.getUTCHours()).toBe(19);
      expect(scheduledDate.getUTCMinutes()).toBe(1);
    }
  }
});

test("E2E: should not create resume job when config is disabled", async () => {
  const rateLimitEntry = {
    type: "assistant" as const,
    isApiErrorMessage: true,
    message: {
      content: [
        {
          type: "text" as const,
          text: "Session limit reached ∙ resets 7pm",
        },
      ],
    },
  };

  const result = await Effect.runPromise(
    createRateLimitResumeJob({
      entry: rateLimitEntry,
      sessionId: "test-session-id",
      projectId: "test-project-id",
      autoResumeEnabled: false, // Disabled
    }).pipe(Effect.provide(testLayer)),
  );

  // Assert: Job should not be created (returns null)
  expect(result).toBeNull();
});

test("E2E: should not create job for non-rate-limit messages", async () => {
  const normalEntry = {
    type: "assistant" as const,
    message: {
      content: [
        {
          type: "text" as const,
          text: "Hello, how can I help you?",
        },
      ],
    },
  };

  const result = await Effect.runPromise(
    createRateLimitResumeJob({
      entry: normalEntry,
      sessionId: "test-session-id",
      projectId: "test-project-id",
      autoResumeEnabled: true, // Enabled but entry is not a rate limit message
    }).pipe(Effect.provide(testLayer)),
  );

  // Assert: Job should not be created (returns null)
  expect(result).toBeNull();
});

test("E2E: should handle invalid reset time gracefully", async () => {
  const invalidEntry = {
    type: "assistant" as const,
    isApiErrorMessage: true,
    message: {
      content: [
        {
          type: "text" as const,
          text: "Session limit reached ∙ resets invalid-time",
        },
      ],
    },
  };

  const result = await Effect.runPromise(
    createRateLimitResumeJob({
      entry: invalidEntry,
      sessionId: "test-session-id",
      projectId: "test-project-id",
      autoResumeEnabled: true, // Enabled but time format is invalid
    }).pipe(Effect.provide(testLayer)),
  );

  // Assert: Job should not be created (graceful degradation, returns null)
  expect(result).toBeNull();
});
