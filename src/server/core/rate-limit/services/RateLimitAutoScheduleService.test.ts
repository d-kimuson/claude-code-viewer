import { FileSystem, Path } from "@effect/platform";
import { it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { afterEach, beforeEach, describe, expect, vi } from "vitest";
import { testPlatformLayer } from "../../../../testing/layers/testPlatformLayer.ts";
import { ClaudeCodeLifeCycleService } from "../../claude-code/services/ClaudeCodeLifeCycleService.ts";
import { ClaudeCodeSessionProcessService } from "../../claude-code/services/ClaudeCodeSessionProcessService.ts";
import { EventBus } from "../../events/services/EventBus.ts";
import { ProjectRepository } from "../../project/infrastructure/ProjectRepository.ts";
import { SchedulerConfigBaseDir } from "../../scheduler/config.ts";
import { SchedulerService, type ISchedulerService } from "../../scheduler/domain/Scheduler.ts";
import type { NewSchedulerJob, SchedulerJob } from "../../scheduler/schema.ts";
import { RateLimitAutoScheduleService } from "./RateLimitAutoScheduleService.ts";

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

    const mockSchedulerService: ISchedulerService = {
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
      updateJob: () => Effect.die(new Error("Not implemented in this test")),
      deleteJob: () => Effect.succeed(undefined),
    };

    return Layer.succeed(SchedulerService, mockSchedulerService);
  };

  // Mock ClaudeCodeSessionProcessService with configurable live processes
  const createMockSessionProcessService = (
    liveSessionIds: Set<string> = new Set(),
    projectIdForSession: Map<string, string> = new Map(),
  ) => {
    const mockSessionProcessService = {
      startSessionProcess: () => Effect.die(new Error("Not implemented in this test")),
      continueSessionProcess: () => Effect.die(new Error("Not implemented in this test")),
      updateRawUserMessage: () => Effect.die(new Error("Not implemented in this test")),
      toInitializedState: () => Effect.die(new Error("Not implemented in this test")),
      toFileCreatedState: () => Effect.die(new Error("Not implemented in this test")),
      toPausedState: () => Effect.die(new Error("Not implemented in this test")),
      toCompletedState: () => Effect.die(new Error("Not implemented in this test")),
      dangerouslyChangeProcessState: () => Effect.die(new Error("Not implemented in this test")),
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
              getQueuedMessages: () => [],
              getQueueSize: () => 0,
            },
            tasks: [],
          })),
        ),
      getSessionProcess: () => Effect.die(new Error("Not implemented in this test")),
      getTask: () => Effect.die(new Error("Not implemented in this test")),
      changeTurnState: () => Effect.die(new Error("Not implemented in this test")),
    };

    return Layer.succeed(ClaudeCodeSessionProcessService, mockSessionProcessService);
  };

  // Mock FileSystem that returns specific content
  const createMockFileSystem = (fileContent: string) => {
    return FileSystem.layerNoop({
      readFileString: () => Effect.succeed(fileContent),
    });
  };

  // Mock ProjectRepository
  const mockProjectRepositoryService = {
    getProject: () =>
      Effect.succeed({
        project: {
          id: "test-project",
          claudeProjectPath: "/test/project",
          lastModifiedAt: new Date("2026-01-24T10:00:00.000Z"),
          meta: {
            projectName: "test-project",
            projectPath: "/test/project",
            sessionCount: 1,
          },
        },
      }),
    getProjects: () =>
      Effect.succeed({
        projects: [],
      }),
  };
  const mockProjectRepository = Layer.succeed(ProjectRepository, mockProjectRepositoryService);

  // Mock ClaudeCodeLifeCycleService
  const mockLifeCycleServiceImpl = {
    continueSessionProcess: () => Effect.die(new Error("Not implemented in this test")),
    startSessionProcess: () => Effect.die(new Error("Not implemented in this test")),
    enqueueMessage: () => Effect.die(new Error("Not implemented in this test")),
    abortTask: () => Effect.void,
    abortAllTasks: () => Effect.void,
    getPublicSessionProcesses: () => Effect.succeed([]),
  };
  const mockLifeCycleService = Layer.succeed(ClaudeCodeLifeCycleService, mockLifeCycleServiceImpl);

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
    it.live("can initialize the service", () =>
      Effect.gen(function* () {
        const service = yield* RateLimitAutoScheduleService;

        expect(service).toBeDefined();
        expect(service.start).toBeDefined();
        expect(service.stop).toBeDefined();
      }).pipe(
        Effect.provide(RateLimitAutoScheduleService.Live),
        Effect.provide(createMockSchedulerService()),
        Effect.provide(createMockSessionProcessService(new Set(), new Map())),
        Effect.provide(createMockFileSystem("")),
        Effect.provide(additionalLayers),
        Effect.provide(testPlatformLayer()),
      ),
    );
  });

  describe("rate limit detection and job scheduling", () => {
    it.live("does not schedule job when autoScheduleContinueOnRateLimit is disabled", () =>
      Effect.gen(function* () {
        const service = yield* RateLimitAutoScheduleService;
        const eventBus = yield* EventBus;

        yield* service.start();

        // Emit session changed event
        yield* eventBus.emit("sessionChanged", {
          projectId: "test-project",
          sessionId: "9112408c-3585-4a39-a13f-11045828d870",
        });
      }).pipe(
        Effect.provide(RateLimitAutoScheduleService.Live),
        Effect.provide(createMockSchedulerService()),
        Effect.provide(
          createMockSessionProcessService(
            new Set(["9112408c-3585-4a39-a13f-11045828d870"]),
            new Map([["9112408c-3585-4a39-a13f-11045828d870", "test-project"]]),
          ),
        ),
        Effect.provide(createMockFileSystem(rateLimitJsonLine)),
        Effect.provide(additionalLayers),
        Effect.provide(
          testPlatformLayer({
            userConfig: { autoScheduleContinueOnRateLimit: false },
          }),
        ),
        Effect.tap(() =>
          Effect.promise(async () => {
            // Wait for async event processing
            await waitForEventProcessing();

            expect(addedJobs).toHaveLength(0);
          }),
        ),
      ),
    );

    it.live("does not schedule job when session has no live process", () =>
      Effect.gen(function* () {
        const service = yield* RateLimitAutoScheduleService;
        const eventBus = yield* EventBus;

        yield* service.start();

        // Emit session changed event for a session without a live process
        yield* eventBus.emit("sessionChanged", {
          projectId: "test-project",
          sessionId: "non-existent-session",
        });
      }).pipe(
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
        Effect.tap(() =>
          Effect.promise(async () => {
            // Wait for async event processing
            await waitForEventProcessing();

            expect(addedJobs).toHaveLength(0);
          }),
        ),
      ),
    );

    it.live("does not schedule job when last line is not a rate limit message", () =>
      Effect.gen(function* () {
        const service = yield* RateLimitAutoScheduleService;
        const eventBus = yield* EventBus;

        yield* service.start();

        yield* eventBus.emit("sessionChanged", {
          projectId: "test-project",
          sessionId: "some-session-id",
        });
      }).pipe(
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
        Effect.tap(() =>
          Effect.promise(async () => {
            // Wait for async event processing
            await waitForEventProcessing();

            expect(addedJobs).toHaveLength(0);
          }),
        ),
      ),
    );

    it.live("schedules a reserved job when rate limit is detected on a live session", () => {
      // Set a fixed time for consistent test results
      vi.setSystemTime(new Date("2026-01-24T10:00:00.000Z"));

      return Effect.gen(function* () {
        const service = yield* RateLimitAutoScheduleService;
        const eventBus = yield* EventBus;

        yield* service.start();

        yield* eventBus.emit("sessionChanged", {
          projectId: "test-project",
          sessionId: "9112408c-3585-4a39-a13f-11045828d870",
        });
      }).pipe(
        Effect.provide(RateLimitAutoScheduleService.Live),
        Effect.provide(createMockSchedulerService()),
        Effect.provide(
          createMockSessionProcessService(
            new Set(["9112408c-3585-4a39-a13f-11045828d870"]),
            new Map([["9112408c-3585-4a39-a13f-11045828d870", "test-project"]]),
          ),
        ),
        Effect.provide(createMockFileSystem(rateLimitJsonLine)),
        Effect.provide(additionalLayers),
        Effect.provide(
          testPlatformLayer({
            userConfig: { autoScheduleContinueOnRateLimit: true },
          }),
        ),
        Effect.tap(() =>
          Effect.promise(async () => {
            // Wait for async event processing
            await waitForEventProcessing();

            expect(addedJobs).toHaveLength(1);
            const [firstJob] = addedJobs;
            if (firstJob === undefined) {
              throw new Error("Expected first scheduled job to exist");
            }
            expect(firstJob.name).toContain("Rate limit");
            expect(firstJob.schedule.type).toBe("reserved");
            if (firstJob.schedule.type !== "reserved") {
              throw new Error("Expected reserved schedule");
            }
            expect(typeof firstJob.schedule.reservedExecutionTime).toBe("string");
            expect(firstJob.message.content).toBe("continue");
            expect(firstJob.message.projectId).toBe("test-project");
            expect(firstJob.message.sessionId).toBe("9112408c-3585-4a39-a13f-11045828d870");
            expect(firstJob.message.resume).toBe(true);
            expect(firstJob.enabled).toBe(true);
          }),
        ),
      );
    });

    it.live("does not create duplicate jobs for the same session", () => {
      vi.setSystemTime(new Date("2026-01-24T10:00:00.000Z"));

      // Use a shared scheduler service to track jobs across both events
      const schedulerServiceLayer = createMockSchedulerService();

      return Effect.gen(function* () {
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
      }).pipe(
        Effect.provide(RateLimitAutoScheduleService.Live),
        Effect.provide(schedulerServiceLayer),
        Effect.provide(
          createMockSessionProcessService(
            new Set(["9112408c-3585-4a39-a13f-11045828d870"]),
            new Map([["9112408c-3585-4a39-a13f-11045828d870", "test-project"]]),
          ),
        ),
        Effect.provide(createMockFileSystem(rateLimitJsonLine)),
        Effect.provide(additionalLayers),
        Effect.provide(
          testPlatformLayer({
            userConfig: { autoScheduleContinueOnRateLimit: true },
          }),
        ),
        Effect.tap(() =>
          Effect.sync(() => {
            // Should only create one job even though two events were emitted
            expect(addedJobs).toHaveLength(1);
          }),
        ),
      );
    });
  });
});
