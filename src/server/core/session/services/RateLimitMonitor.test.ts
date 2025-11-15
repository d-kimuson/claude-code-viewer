import { Effect, Layer } from "effect";
import { expect, test, vi } from "vitest";
import { testFileSystemLayer, testPlatformLayer } from "@/testing/layers";
import { ClaudeCodeLifeCycleService } from "../../claude-code/services/ClaudeCodeLifeCycleService";
import { EventBus } from "../../events/services/EventBus";
import { ProjectRepository } from "../../project/infrastructure/ProjectRepository";
import { SchedulerConfigBaseDir } from "../../scheduler/config";
import { SchedulerService } from "../../scheduler/domain/Scheduler";
import type { SchedulerJob } from "../../scheduler/schema";
import { SessionRepository } from "../infrastructure/SessionRepository";
import { createMockSessionMeta } from "../testing/createMockSessionMeta";
import { RateLimitMonitor } from "./RateLimitMonitor";

const createMockSession = (
  isApiErrorMessage: boolean,
  messageText: string,
) => ({
  id: "test-session-123",
  jsonlFilePath: "/path/to/session.jsonl",
  lastModifiedAt: new Date("2025-11-15T10:00:00.000Z"),
  meta: createMockSessionMeta({
    messageCount: 1,
    firstUserMessage: null,
  }),
  conversations: [
    {
      // Base entry fields
      isSidechain: false,
      userType: "external" as const,
      cwd: "/test/cwd",
      sessionId: "test-session-123",
      version: "1.0.0",
      uuid: "00000000-0000-0000-0000-000000000001",
      timestamp: "2025-11-15T10:00:00.000Z",
      parentUuid: null,
      // Assistant entry fields
      type: "assistant" as const,
      isApiErrorMessage,
      message: {
        id: "msg_123",
        type: "message" as const,
        role: "assistant" as const,
        model: "claude-3-5-sonnet-20241022" as const,
        content: [{ type: "text" as const, text: messageText }],
        stop_reason: "end_turn" as const,
        stop_sequence: null,
        usage: {
          input_tokens: 100,
          cache_read_input_tokens: 0,
          cache_creation_input_tokens: 0,
          output_tokens: 50,
        },
      },
    },
  ],
});

const createMockSchedulerJob = (
  sessionId: string,
  resumeTime: string,
): SchedulerJob => ({
  id: `job-${sessionId}`,
  name: `Auto-resume: ${sessionId}`,
  schedule: {
    type: "reserved",
    reservedExecutionTime: resumeTime,
  },
  message: {
    content: "continue",
    projectId: "test-project-456",
    baseSessionId: sessionId,
  },
  enabled: true,
  createdAt: new Date().toISOString(),
  lastRunAt: null,
  lastRunStatus: null,
});

/**
 * Creates common dependency layers needed for RateLimitMonitor tests
 */
const createCommonDependencyLayers = () => {
  const projectRepositoryLayer = Layer.mock(ProjectRepository, {
    getProject: () =>
      Effect.succeed({
        project: {
          id: "test-project-456",
          claudeProjectPath: "/path/to/project",
          lastModifiedAt: new Date(),
          meta: {
            projectName: "Test Project",
            projectPath: "/path/to/project",
            sessionCount: 1,
          },
        },
      }),
    getProjects: () => Effect.succeed({ projects: [], total: 0 }),
  });

  const claudeCodeLifeCycleServiceLayer = Layer.mock(
    ClaudeCodeLifeCycleService,
    {
      startTask: () => Effect.die("startTask should not be called"),
      continueTask: () => Effect.die("continueTask should not be called"),
      abortTask: () => Effect.die("abortTask should not be called"),
    },
  );

  const schedulerConfigBaseDirLayer = Layer.succeed(
    SchedulerConfigBaseDir,
    "/tmp/test-scheduler",
  );

  const fileSystemLayer = testFileSystemLayer();

  return Layer.mergeAll(
    projectRepositoryLayer,
    claudeCodeLifeCycleServiceLayer,
    schedulerConfigBaseDirLayer,
    fileSystemLayer,
  );
};

test("RateLimitMonitor - should create resume job when rate limit message is detected", async () => {
  const mockSession = createMockSession(
    true,
    "Session limit reached ∙ resets 7pm",
  );

  const mockJob = createMockSchedulerJob(
    "test-session-123",
    "2025-11-15T19:01:00.000Z",
  );
  const addJobMock = vi.fn(() => Effect.succeed(mockJob));

  const program = Effect.gen(function* () {
    const eventBus = yield* EventBus;
    const monitor = yield* RateLimitMonitor;

    // Start monitoring
    yield* monitor.startMonitoring();

    // Emit sessionChanged event
    yield* eventBus.emit("sessionChanged", {
      projectId: "test-project-456",
      sessionId: "test-session-123",
    });

    // Wait for async processing
    yield* Effect.sleep("100 millis");

    return addJobMock.mock.calls.length;
  });

  const sessionRepositoryLayer = Layer.mock(SessionRepository, {
    getSession: () => Effect.succeed({ session: mockSession }),
    getSessions: () => Effect.succeed({ sessions: [], total: 0 }),
  });

  const schedulerServiceLayer = Layer.mock(SchedulerService, {
    getJobs: () => Effect.succeed([]),
    addJob: addJobMock,
    updateJob: () => Effect.die("updateJob should not be called"),
    deleteJob: () => Effect.succeed(undefined),
  });

  const commonDependencyLayers = createCommonDependencyLayers();

  const callCount = await Effect.runPromise(
    program.pipe(
      Effect.provide(
        Layer.provide(
          RateLimitMonitor.Live,
          Layer.mergeAll(
            sessionRepositoryLayer,
            schedulerServiceLayer,
            commonDependencyLayers,
          ),
        ),
      ),
      Effect.provide(
        testPlatformLayer({
          userConfig: {
            autoResumeOnRateLimit: true,
          },
        }),
      ),
    ),
  );

  expect(callCount).toBe(1);
  expect(addJobMock).toHaveBeenCalledWith({
    name: "Auto-resume: test-session-123",
    schedule: {
      type: "reserved",
      reservedExecutionTime: expect.stringMatching(
        /^\d{4}-\d{2}-\d{2}T\d{2}:01:00\.000Z$/,
      ),
    },
    message: {
      content: "continue",
      projectId: "test-project-456",
      baseSessionId: "test-session-123",
    },
    enabled: true,
  });
});

test("RateLimitMonitor - should not create job when autoResumeOnRateLimit is disabled", async () => {
  const mockSession = createMockSession(
    true,
    "Session limit reached ∙ resets 7pm",
  );

  const mockJob = createMockSchedulerJob(
    "test-session-123",
    "2025-11-15T19:01:00.000Z",
  );
  const addJobMock = vi.fn(() => Effect.succeed(mockJob));

  const program = Effect.gen(function* () {
    const eventBus = yield* EventBus;
    const monitor = yield* RateLimitMonitor;

    yield* monitor.startMonitoring();

    yield* eventBus.emit("sessionChanged", {
      projectId: "test-project-456",
      sessionId: "test-session-123",
    });

    yield* Effect.sleep("100 millis");

    return addJobMock.mock.calls.length;
  });

  const sessionRepositoryLayer = Layer.mock(SessionRepository, {
    getSession: () => Effect.succeed({ session: mockSession }),
    getSessions: () => Effect.succeed({ sessions: [], total: 0 }),
  });

  const schedulerServiceLayer = Layer.mock(SchedulerService, {
    getJobs: () => Effect.succeed([]),
    addJob: addJobMock,
    updateJob: () => Effect.die("updateJob should not be called"),
    deleteJob: () => Effect.succeed(undefined),
  });

  const callCount = await Effect.runPromise(
    program.pipe(
      Effect.provide(
        Layer.provide(
          RateLimitMonitor.Live,
          Layer.mergeAll(
            sessionRepositoryLayer,
            schedulerServiceLayer,
            createCommonDependencyLayers(),
          ),
        ),
      ),
      Effect.provide(
        testPlatformLayer({
          userConfig: {
            autoResumeOnRateLimit: false, // Disabled
          },
        }),
      ),
    ),
  );

  // Should not create job when disabled
  expect(callCount).toBe(0);
});

test("RateLimitMonitor - should not process non-rate-limit messages", async () => {
  const mockSession = createMockSession(false, "Regular message");

  const mockJob = createMockSchedulerJob(
    "test-session-123",
    "2025-11-15T19:01:00.000Z",
  );
  const addJobMock = vi.fn(() => Effect.succeed(mockJob));

  const program = Effect.gen(function* () {
    const eventBus = yield* EventBus;
    const monitor = yield* RateLimitMonitor;

    yield* monitor.startMonitoring();

    yield* eventBus.emit("sessionChanged", {
      projectId: "test-project-456",
      sessionId: "test-session-123",
    });

    yield* Effect.sleep("100 millis");

    return addJobMock.mock.calls.length;
  });

  const sessionRepositoryLayer = Layer.mock(SessionRepository, {
    getSession: () => Effect.succeed({ session: mockSession }),
    getSessions: () => Effect.succeed({ sessions: [], total: 0 }),
  });

  const schedulerServiceLayer = Layer.mock(SchedulerService, {
    getJobs: () => Effect.succeed([]),
    addJob: addJobMock,
    updateJob: () => Effect.die("updateJob should not be called"),
    deleteJob: () => Effect.succeed(undefined),
  });

  const callCount = await Effect.runPromise(
    program.pipe(
      Effect.provide(
        Layer.provide(
          RateLimitMonitor.Live,
          Layer.mergeAll(
            sessionRepositoryLayer,
            schedulerServiceLayer,
            createCommonDependencyLayers(),
          ),
        ),
      ),
      Effect.provide(testPlatformLayer()),
    ),
  );

  // Should not be called for non-rate-limit messages
  expect(callCount).toBe(0);
});

test("RateLimitMonitor - should handle errors gracefully", async () => {
  const mockJob = createMockSchedulerJob(
    "test-session-123",
    "2025-11-15T19:01:00.000Z",
  );
  const addJobMock = vi.fn(() => Effect.succeed(mockJob));

  const program = Effect.gen(function* () {
    const eventBus = yield* EventBus;
    const monitor = yield* RateLimitMonitor;

    yield* monitor.startMonitoring();

    yield* eventBus.emit("sessionChanged", {
      projectId: "test-project-456",
      sessionId: "test-session-123",
    });

    yield* Effect.sleep("100 millis");

    return "completed";
  });

  // SessionRepository returns error
  const sessionRepositoryLayer = Layer.mock(SessionRepository, {
    getSession: () => Effect.fail(new Error("Failed to read session")),
    getSessions: () => Effect.fail(new Error("Failed to list sessions")),
  });

  const schedulerServiceLayer = Layer.mock(SchedulerService, {
    getJobs: () => Effect.succeed([]),
    addJob: addJobMock,
    updateJob: () => Effect.die("updateJob should not be called"),
    deleteJob: () => Effect.succeed(undefined),
  });

  const result = await Effect.runPromise(
    program.pipe(
      Effect.provide(
        Layer.provide(
          RateLimitMonitor.Live,
          Layer.mergeAll(
            sessionRepositoryLayer,
            schedulerServiceLayer,
            createCommonDependencyLayers(),
          ),
        ),
      ),
      Effect.provide(testPlatformLayer()),
    ),
  );

  // Should not crash, just skip processing
  expect(result).toBe("completed");
  expect(addJobMock).not.toHaveBeenCalled();
});

test("RateLimitMonitor - should stop monitoring when stop is called", async () => {
  const mockSession = createMockSession(
    true,
    "Session limit reached ∙ resets 7pm",
  );

  const mockJob = createMockSchedulerJob(
    "test-session-123",
    "2025-11-15T19:01:00.000Z",
  );
  const addJobMock = vi.fn(() => Effect.succeed(mockJob));

  const program = Effect.gen(function* () {
    const eventBus = yield* EventBus;
    const monitor = yield* RateLimitMonitor;

    yield* monitor.startMonitoring();
    yield* monitor.stopMonitoring();

    yield* eventBus.emit("sessionChanged", {
      projectId: "test-project-456",
      sessionId: "test-session-123",
    });

    yield* Effect.sleep("100 millis");

    return addJobMock.mock.calls.length;
  });

  const sessionRepositoryLayer = Layer.mock(SessionRepository, {
    getSession: () => Effect.succeed({ session: mockSession }),
    getSessions: () => Effect.succeed({ sessions: [], total: 0 }),
  });

  const schedulerServiceLayer = Layer.mock(SchedulerService, {
    getJobs: () => Effect.succeed([]),
    addJob: addJobMock,
    updateJob: () => Effect.die("updateJob should not be called"),
    deleteJob: () => Effect.succeed(undefined),
  });

  const callCount = await Effect.runPromise(
    program.pipe(
      Effect.provide(
        Layer.provide(
          RateLimitMonitor.Live,
          Layer.mergeAll(
            sessionRepositoryLayer,
            schedulerServiceLayer,
            createCommonDependencyLayers(),
          ),
        ),
      ),
      Effect.provide(testPlatformLayer()),
    ),
  );

  // Should not process events after stop
  expect(callCount).toBe(0);
});

test("RateLimitMonitor - should handle real session log data from 6bfc24e3-8911-4063-b4a1-236e49d13a6f", async () => {
  // This is the actual entry from line 960 of the real session log
  const realRateLimitEntry = {
    parentUuid: "038f6b1d-d121-49ba-a327-60aed960d92e",
    isSidechain: false,
    userType: "external" as const,
    cwd: "/home/kaito/repos/claude-code-viewer",
    sessionId: "6bfc24e3-8911-4063-b4a1-236e49d13a6f",
    version: "2.0.24",
    gitBranch: "feature/6423aa72-strict-process-management",
    type: "assistant" as const,
    uuid: "ac93493b-80c8-41bc-a6b8-856dcccbdc69",
    timestamp: "2025-11-09T07:55:43.888Z",
    message: {
      id: "2adab99b-e90b-4991-bf0a-1f017d51d738",
      container: null,
      model: "<synthetic>" as const,
      role: "assistant" as const,
      stop_reason: "stop_sequence" as const,
      stop_sequence: "",
      type: "message" as const,
      usage: {
        input_tokens: 0,
        output_tokens: 0,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
        server_tool_use: {
          web_search_requests: 0,
        },
        service_tier: null,
        cache_creation: {
          ephemeral_1h_input_tokens: 0,
          ephemeral_5m_input_tokens: 0,
        },
      },
      content: [
        {
          type: "text" as const,
          text: "Session limit reached ∙ resets 7pm",
        },
      ],
    },
    isApiErrorMessage: true,
  };

  const mockSession = {
    id: "6bfc24e3-8911-4063-b4a1-236e49d13a6f",
    jsonlFilePath:
      "/home/kaito/.claude/projects/-home-kaito-repos-claude-code-viewer/6bfc24e3-8911-4063-b4a1-236e49d13a6f.jsonl",
    lastModifiedAt: new Date("2025-11-09T07:55:43.888Z"),
    meta: createMockSessionMeta({
      messageCount: 960,
      firstUserMessage: null,
    }),
    conversations: [realRateLimitEntry],
  };

  const mockJob = createMockSchedulerJob(
    "6bfc24e3-8911-4063-b4a1-236e49d13a6f",
    "2025-11-09T19:01:00.000Z",
  );
  const addJobMock = vi.fn(() => Effect.succeed(mockJob));

  const program = Effect.gen(function* () {
    const eventBus = yield* EventBus;
    const monitor = yield* RateLimitMonitor;

    yield* monitor.startMonitoring();

    yield* eventBus.emit("sessionChanged", {
      projectId: "-home-kaito-repos-claude-code-viewer",
      sessionId: "6bfc24e3-8911-4063-b4a1-236e49d13a6f",
    });

    yield* Effect.sleep("100 millis");

    return addJobMock.mock.calls;
  });

  const sessionRepositoryLayer = Layer.mock(SessionRepository, {
    getSession: () => Effect.succeed({ session: mockSession }),
    getSessions: () => Effect.succeed({ sessions: [], total: 0 }),
  });

  const schedulerServiceLayer = Layer.mock(SchedulerService, {
    getJobs: () => Effect.succeed([]),
    addJob: addJobMock,
    updateJob: () => Effect.die("updateJob should not be called"),
    deleteJob: () => Effect.succeed(undefined),
  });

  const mockCalls = await Effect.runPromise(
    program.pipe(
      Effect.provide(
        Layer.provide(
          RateLimitMonitor.Live,
          Layer.mergeAll(
            sessionRepositoryLayer,
            schedulerServiceLayer,
            createCommonDependencyLayers(),
          ),
        ),
      ),
      Effect.provide(
        testPlatformLayer({
          userConfig: {
            autoResumeOnRateLimit: true,
          },
        }),
      ),
    ),
  );

  // Verify that the job was created with the correct parameters
  expect(mockCalls.length).toBe(1);
  expect(addJobMock).toHaveBeenCalledWith({
    name: "Auto-resume: 6bfc24e3-8911-4063-b4a1-236e49d13a6f",
    schedule: {
      type: "reserved",
      reservedExecutionTime: expect.stringMatching(
        /^\d{4}-\d{2}-\d{2}T\d{2}:01:00\.000Z$/,
      ),
    },
    message: {
      content: "continue",
      projectId: "-home-kaito-repos-claude-code-viewer",
      baseSessionId: "6bfc24e3-8911-4063-b4a1-236e49d13a6f",
    },
    enabled: true,
  });
});
