import { Effect, Layer } from "effect";
import { expect, test, vi } from "vitest";
import { testPlatformLayer } from "@/testing/layers";
import { EventBus } from "../../events/services/EventBus";
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

test("RateLimitMonitor - should create resume job when rate limit message is detected", async () => {
  const mockSession = createMockSession(
    true,
    "Session limit reached ∙ resets 7pm",
  );

  const createResumeJobMock = vi.fn(() => Effect.succeed({ id: "job-1" }));

  const program = Effect.gen(function* () {
    const eventBus = yield* EventBus;
    const monitor = yield* RateLimitMonitor;

    // Replace createRateLimitResumeJob with mock
    monitor._setCreateResumeJob(createResumeJobMock);

    // Start monitoring
    yield* monitor.startMonitoring();

    // Emit sessionChanged event
    yield* eventBus.emit("sessionChanged", {
      projectId: "test-project-456",
      sessionId: "test-session-123",
    });

    // Wait for async processing
    yield* Effect.sleep("100 millis");

    return createResumeJobMock.mock.calls.length;
  });

  const sessionRepositoryLayer = Layer.mock(SessionRepository, {
    getSession: () => Effect.succeed({ session: mockSession }),
    getSessions: () => Effect.succeed({ sessions: [], total: 0 }),
  });

  const callCount = await Effect.runPromise(
    program.pipe(
      Effect.provide(
        Layer.provide(RateLimitMonitor.Live, sessionRepositoryLayer),
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
  expect(createResumeJobMock).toHaveBeenCalledWith({
    entry: mockSession.conversations[0],
    sessionId: "test-session-123",
    projectId: "test-project-456",
    autoResumeEnabled: true,
  });
});

test("RateLimitMonitor - should not create job when autoResumeOnRateLimit is disabled", async () => {
  const mockSession = createMockSession(
    true,
    "Session limit reached ∙ resets 7pm",
  );

  const createResumeJobMock = vi.fn(() => Effect.succeed(null));

  const program = Effect.gen(function* () {
    const eventBus = yield* EventBus;
    const monitor = yield* RateLimitMonitor;

    monitor._setCreateResumeJob(createResumeJobMock);
    yield* monitor.startMonitoring();

    yield* eventBus.emit("sessionChanged", {
      projectId: "test-project-456",
      sessionId: "test-session-123",
    });

    yield* Effect.sleep("100 millis");

    return createResumeJobMock.mock.calls.length;
  });

  const sessionRepositoryLayer = Layer.mock(SessionRepository, {
    getSession: () => Effect.succeed({ session: mockSession }),
    getSessions: () => Effect.succeed({ sessions: [], total: 0 }),
  });

  const callCount = await Effect.runPromise(
    program.pipe(
      Effect.provide(
        Layer.provide(RateLimitMonitor.Live, sessionRepositoryLayer),
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

  // Should be called with autoResumeEnabled: false
  expect(callCount).toBe(1);
  expect(createResumeJobMock).toHaveBeenCalledWith({
    entry: mockSession.conversations[0],
    sessionId: "test-session-123",
    projectId: "test-project-456",
    autoResumeEnabled: false,
  });
});

test("RateLimitMonitor - should not process non-rate-limit messages", async () => {
  const mockSession = createMockSession(false, "Regular message");

  const createResumeJobMock = vi.fn(() => Effect.succeed(null));

  const program = Effect.gen(function* () {
    const eventBus = yield* EventBus;
    const monitor = yield* RateLimitMonitor;

    monitor._setCreateResumeJob(createResumeJobMock);
    yield* monitor.startMonitoring();

    yield* eventBus.emit("sessionChanged", {
      projectId: "test-project-456",
      sessionId: "test-session-123",
    });

    yield* Effect.sleep("100 millis");

    return createResumeJobMock.mock.calls.length;
  });

  const sessionRepositoryLayer = Layer.mock(SessionRepository, {
    getSession: () => Effect.succeed({ session: mockSession }),
    getSessions: () => Effect.succeed({ sessions: [], total: 0 }),
  });

  const callCount = await Effect.runPromise(
    program.pipe(
      Effect.provide(
        Layer.provide(RateLimitMonitor.Live, sessionRepositoryLayer),
      ),
      Effect.provide(testPlatformLayer()),
    ),
  );

  // Should not be called for non-rate-limit messages
  expect(callCount).toBe(0);
});

test("RateLimitMonitor - should handle errors gracefully", async () => {
  const createResumeJobMock = vi.fn(() => Effect.succeed(null));

  const program = Effect.gen(function* () {
    const eventBus = yield* EventBus;
    const monitor = yield* RateLimitMonitor;

    monitor._setCreateResumeJob(createResumeJobMock);
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

  const result = await Effect.runPromise(
    program.pipe(
      Effect.provide(
        Layer.provide(RateLimitMonitor.Live, sessionRepositoryLayer),
      ),
      Effect.provide(testPlatformLayer()),
    ),
  );

  // Should not crash, just skip processing
  expect(result).toBe("completed");
  expect(createResumeJobMock).not.toHaveBeenCalled();
});

test("RateLimitMonitor - should stop monitoring when stop is called", async () => {
  const mockSession = createMockSession(
    true,
    "Session limit reached ∙ resets 7pm",
  );

  const createResumeJobMock = vi.fn(() => Effect.succeed(null));

  const program = Effect.gen(function* () {
    const eventBus = yield* EventBus;
    const monitor = yield* RateLimitMonitor;

    monitor._setCreateResumeJob(createResumeJobMock);
    yield* monitor.startMonitoring();
    yield* monitor.stopMonitoring();

    yield* eventBus.emit("sessionChanged", {
      projectId: "test-project-456",
      sessionId: "test-session-123",
    });

    yield* Effect.sleep("100 millis");

    return createResumeJobMock.mock.calls.length;
  });

  const sessionRepositoryLayer = Layer.mock(SessionRepository, {
    getSession: () => Effect.succeed({ session: mockSession }),
    getSessions: () => Effect.succeed({ sessions: [], total: 0 }),
  });

  const callCount = await Effect.runPromise(
    program.pipe(
      Effect.provide(
        Layer.provide(RateLimitMonitor.Live, sessionRepositoryLayer),
      ),
      Effect.provide(testPlatformLayer()),
    ),
  );

  // Should not process events after stop
  expect(callCount).toBe(0);
});
