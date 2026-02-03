import { FileSystem, Path } from "@effect/platform";
import { Effect, Layer } from "effect";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { testPlatformLayer } from "../../../../testing/layers/testPlatformLayer";
import { ClaudeCodeLifeCycleService } from "../../claude-code/services/ClaudeCodeLifeCycleService";
import { ClaudeCodeSessionProcessService } from "../../claude-code/services/ClaudeCodeSessionProcessService";
import { EventBus } from "../../events/services/EventBus";
import { ProjectRepository } from "../../project/infrastructure/ProjectRepository";
import { SchedulerConfigBaseDir } from "../../scheduler/config";
import { SchedulerService } from "../../scheduler/domain/Scheduler";
import type { NewSchedulerJob, SchedulerJob } from "../../scheduler/schema";
import { RateLimitAutoScheduleService } from "./RateLimitAutoScheduleService";

/**
 * Helper to wait for async event processing to complete.
 * Uses real timers to wait for Effect.runFork callbacks.
 */
const waitForEventProcessing = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 50));

describe("RateLimitAutoScheduleService", () => {
  // Mock rate limit JSON line
  const rateLimitJsonLine = JSON.stringify({
    parentUuid: "7a75ca65-bfe3-45f2-8107-5abb1c91e12e",
    isSidechain: false,
    userType: "external",
    cwd: "/home/kaito/repos/agent-bridge",
    sessionId: "9112408c-3585-4a39-a13f-11045828d870",
    version: "2.1.0",
    gitBranch: "main",
    type: "assistant",
    uuid: "6fe0e12b-0160-4156-8c5f-66d1cd20944a",
    timestamp: "2026-01-24T09:54:19.597Z",
    message: {
      id: "38434a42-356d-496f-ba6b-fba39cb50b35",
      container: null,
      model: "<synthetic>",
      role: "assistant",
      stop_reason: "stop_sequence",
      stop_sequence: "",
      type: "message",
      usage: {
        input_tokens: 0,
        output_tokens: 0,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
        server_tool_use: { web_search_requests: 0, web_fetch_requests: 0 },
        service_tier: null,
        cache_creation: {
          ephemeral_1h_input_tokens: 0,
          ephemeral_5m_input_tokens: 0,
        },
      },
      content: [
        {
          type: "text",
          text: "You've hit your limit \u00b7 resets 8pm (Asia/Tokyo)",
        },
      ],
      context_management: null,
    },
    error: "rate_limit",
    isApiErrorMessage: true,
  });

  // Non-rate-limit message
  const normalJsonLine = JSON.stringify({
    type: "assistant",
    sessionId: "some-session-id",
    message: {
      content: [{ type: "text", text: "Hello!" }],
    },
  });

  let addedJobs: NewSchedulerJob[];

  // Mock SchedulerService that tracks added jobs
  const createMockSchedulerService = () => {
    addedJobs = [];
    const mockJobs: SchedulerJob[] = [];

    return Layer.succeed(SchedulerService, {
      startScheduler: Effect.void,
      stopScheduler: Effect.void,
      getJobs: () => Effect.succeed(mockJobs),
      addJob: (newJob: NewSchedulerJob) =>
        Effect.sync(() => {
          addedJobs.push(newJob);
          const job: SchedulerJob = {
            ...newJob,
            id: `job-${addedJobs.length}`,
            createdAt: new Date().toISOString(),
            lastRunAt: null,
            lastRunStatus: null,
          };
          mockJobs.push(job);
          return job;
        }),
      updateJob: () => Effect.succeed({} as SchedulerJob),
      deleteJob: () => Effect.succeed(undefined),
    });
  };

  // Mock ClaudeCodeSessionProcessService with configurable live processes
  const createMockSessionProcessService = (
    liveSessionIds: Set<string> = new Set(),
    projectIdForSession: Map<string, string> = new Map(),
  ) => {
    return Layer.succeed(ClaudeCodeSessionProcessService, {
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
      getSessionProcesses: () =>
        Effect.succeed(
          Array.from(liveSessionIds).map((sessionId) => ({
            type: "paused" as const,
            sessionId,
            def: {
              sessionProcessId: `process-${sessionId}`,
              projectId: projectIdForSession.get(sessionId) ?? "test-project",
              cwd: "/test/path",
              abortController: new AbortController(),
              setNextMessage: () => {},
            },
            tasks: [],
          })),
        ),
      getSessionProcess: () => Effect.succeed({} as never),
      getTask: () => Effect.succeed({} as never),
      changeTurnState: () => Effect.succeed({} as never),
    });
  };

  // Mock FileSystem that returns specific content
  const createMockFileSystem = (fileContent: string) => {
    return FileSystem.layerNoop({
      readFileString: () => Effect.succeed(fileContent),
    });
  };

  // Mock ProjectRepository
  const mockProjectRepository = Layer.succeed(ProjectRepository, {
    getProject: () =>
      Effect.succeed({
        project: {
          meta: {
            projectPath: "/test/project",
            encodedProjectId: "test-project",
          },
        },
      } as never),
  } as never);

  // Mock ClaudeCodeLifeCycleService
  const mockLifeCycleService = Layer.succeed(ClaudeCodeLifeCycleService, {
    startTask: () => Effect.void,
    continueTask: () => Effect.void,
  } as never);

  // Additional layers needed for the service
  const additionalLayers = Layer.mergeAll(
    Path.layer,
    Layer.succeed(SchedulerConfigBaseDir, "/tmp/test-scheduler"),
    mockProjectRepository,
    mockLifeCycleService,
  );

  // Use setSystemTime for consistent time-based assertions
  // but avoid useFakeTimers to allow real async execution
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("initialization", () => {
    it("can initialize the service", async () => {
      const program = Effect.gen(function* () {
        const service = yield* RateLimitAutoScheduleService;
        return service;
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(RateLimitAutoScheduleService.Live),
          Effect.provide(createMockSchedulerService()),
          Effect.provide(createMockSessionProcessService(new Set(), new Map())),
          Effect.provide(createMockFileSystem("")),
          Effect.provide(additionalLayers),
          Effect.provide(testPlatformLayer()),
        ),
      );

      expect(result).toBeDefined();
      expect(result.start).toBeDefined();
      expect(result.stop).toBeDefined();
    });
  });

  describe("rate limit detection and job scheduling", () => {
    it("does not schedule job when autoScheduleContinueOnRateLimit is disabled", async () => {
      const program = Effect.gen(function* () {
        const service = yield* RateLimitAutoScheduleService;
        const eventBus = yield* EventBus;

        yield* service.start();

        // Emit session changed event
        yield* eventBus.emit("sessionChanged", {
          projectId: "test-project",
          sessionId: "9112408c-3585-4a39-a13f-11045828d870",
        });
      });

      await Effect.runPromise(
        program.pipe(
          Effect.provide(RateLimitAutoScheduleService.Live),
          Effect.provide(createMockSchedulerService()),
          Effect.provide(
            createMockSessionProcessService(
              new Set(["9112408c-3585-4a39-a13f-11045828d870"]),
              new Map([
                ["9112408c-3585-4a39-a13f-11045828d870", "test-project"],
              ]),
            ),
          ),
          Effect.provide(createMockFileSystem(rateLimitJsonLine)),
          Effect.provide(additionalLayers),
          Effect.provide(
            testPlatformLayer({
              userConfig: { autoScheduleContinueOnRateLimit: false },
            }),
          ),
        ),
      );

      // Wait for async event processing
      await waitForEventProcessing();

      expect(addedJobs).toHaveLength(0);
    });

    it("does not schedule job when session has no live process", async () => {
      const program = Effect.gen(function* () {
        const service = yield* RateLimitAutoScheduleService;
        const eventBus = yield* EventBus;

        yield* service.start();

        // Emit session changed event for a session without a live process
        yield* eventBus.emit("sessionChanged", {
          projectId: "test-project",
          sessionId: "non-existent-session",
        });
      });

      await Effect.runPromise(
        program.pipe(
          Effect.provide(RateLimitAutoScheduleService.Live),
          Effect.provide(createMockSchedulerService()),
          Effect.provide(createMockSessionProcessService(new Set(), new Map())),
          Effect.provide(createMockFileSystem(rateLimitJsonLine)),
          Effect.provide(additionalLayers),
          Effect.provide(
            testPlatformLayer({
              userConfig: { autoScheduleContinueOnRateLimit: true },
            }),
          ),
        ),
      );

      // Wait for async event processing
      await waitForEventProcessing();

      expect(addedJobs).toHaveLength(0);
    });

    it("does not schedule job when last line is not a rate limit message", async () => {
      const program = Effect.gen(function* () {
        const service = yield* RateLimitAutoScheduleService;
        const eventBus = yield* EventBus;

        yield* service.start();

        yield* eventBus.emit("sessionChanged", {
          projectId: "test-project",
          sessionId: "some-session-id",
        });
      });

      await Effect.runPromise(
        program.pipe(
          Effect.provide(RateLimitAutoScheduleService.Live),
          Effect.provide(createMockSchedulerService()),
          Effect.provide(
            createMockSessionProcessService(
              new Set(["some-session-id"]),
              new Map([["some-session-id", "test-project"]]),
            ),
          ),
          Effect.provide(createMockFileSystem(normalJsonLine)),
          Effect.provide(additionalLayers),
          Effect.provide(
            testPlatformLayer({
              userConfig: { autoScheduleContinueOnRateLimit: true },
            }),
          ),
        ),
      );

      // Wait for async event processing
      await waitForEventProcessing();

      expect(addedJobs).toHaveLength(0);
    });

    it("schedules a reserved job when rate limit is detected on a live session", async () => {
      // Set a fixed time for consistent test results
      vi.setSystemTime(new Date("2026-01-24T10:00:00.000Z"));

      const program = Effect.gen(function* () {
        const service = yield* RateLimitAutoScheduleService;
        const eventBus = yield* EventBus;

        yield* service.start();

        yield* eventBus.emit("sessionChanged", {
          projectId: "test-project",
          sessionId: "9112408c-3585-4a39-a13f-11045828d870",
        });
      });

      await Effect.runPromise(
        program.pipe(
          Effect.provide(RateLimitAutoScheduleService.Live),
          Effect.provide(createMockSchedulerService()),
          Effect.provide(
            createMockSessionProcessService(
              new Set(["9112408c-3585-4a39-a13f-11045828d870"]),
              new Map([
                ["9112408c-3585-4a39-a13f-11045828d870", "test-project"],
              ]),
            ),
          ),
          Effect.provide(createMockFileSystem(rateLimitJsonLine)),
          Effect.provide(additionalLayers),
          Effect.provide(
            testPlatformLayer({
              userConfig: { autoScheduleContinueOnRateLimit: true },
            }),
          ),
        ),
      );

      // Wait for async event processing
      await waitForEventProcessing();

      expect(addedJobs).toHaveLength(1);
      expect(addedJobs[0]).toMatchObject({
        name: expect.stringContaining("Rate limit"),
        schedule: {
          type: "reserved",
          reservedExecutionTime: expect.any(String),
        },
        message: {
          content: "continue",
          projectId: "test-project",
          baseSession: {
            type: "resume",
            sessionId: "9112408c-3585-4a39-a13f-11045828d870",
          },
        },
        enabled: true,
      });
    });

    it("does not create duplicate jobs for the same session", async () => {
      vi.setSystemTime(new Date("2026-01-24T10:00:00.000Z"));

      // Use a shared scheduler service to track jobs across both events
      const schedulerServiceLayer = createMockSchedulerService();

      const program = Effect.gen(function* () {
        const service = yield* RateLimitAutoScheduleService;
        const eventBus = yield* EventBus;

        yield* service.start();

        // Emit first event
        yield* eventBus.emit("sessionChanged", {
          projectId: "test-project",
          sessionId: "9112408c-3585-4a39-a13f-11045828d870",
        });

        // Wait for async processing (real timer with shouldAdvanceTime: true)
        yield* Effect.promise(waitForEventProcessing);

        // Emit the same event again (should not create duplicate)
        yield* eventBus.emit("sessionChanged", {
          projectId: "test-project",
          sessionId: "9112408c-3585-4a39-a13f-11045828d870",
        });

        // Wait for async processing again
        yield* Effect.promise(waitForEventProcessing);
      });

      await Effect.runPromise(
        program.pipe(
          Effect.provide(RateLimitAutoScheduleService.Live),
          Effect.provide(schedulerServiceLayer),
          Effect.provide(
            createMockSessionProcessService(
              new Set(["9112408c-3585-4a39-a13f-11045828d870"]),
              new Map([
                ["9112408c-3585-4a39-a13f-11045828d870", "test-project"],
              ]),
            ),
          ),
          Effect.provide(createMockFileSystem(rateLimitJsonLine)),
          Effect.provide(additionalLayers),
          Effect.provide(
            testPlatformLayer({
              userConfig: { autoScheduleContinueOnRateLimit: true },
            }),
          ),
        ),
      );

      // Should only create one job even though two events were emitted
      expect(addedJobs).toHaveLength(1);
    });
  });
});
