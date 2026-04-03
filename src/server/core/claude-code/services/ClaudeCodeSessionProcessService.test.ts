import { it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { describe, expect } from "vitest";
import { testPlatformLayer } from "../../../../testing/layers/testPlatformLayer.ts";
import type * as CCSessionProcess from "../models/CCSessionProcess.ts";
import type * as CCTurn from "../models/ClaudeCodeTurn.ts";
import type { InitMessageContext } from "../types.ts";
import { ClaudeCodeSessionProcessService } from "./ClaudeCodeSessionProcessService.ts";

// Helper function to create mock session process definition
const createMockSessionProcessDef = (
  sessionProcessId: string,
  projectId = "test-project",
): CCSessionProcess.CCSessionProcessDef => ({
  sessionProcessId,
  projectId,
  cwd: "/test/path",
  abortController: new AbortController(),
  setNextMessage: () => {},
});

// Helper function to create mock new task definition
const createMockNewTaskDef = (
  turnId: string,
  sessionId = "new-session-id",
): CCTurn.NewClaudeCodeTurnDef => ({
  type: "new",
  turnId,
  sessionId,
});

// Helper function to create mock continue task definition
const createMockContinueTaskDef = (
  turnId: string,
  sessionId: string,
  baseSessionId: string,
): CCTurn.ContinueClaudeCodeTurnDef => ({
  type: "continue",
  turnId,
  sessionId,
  baseSessionId,
});

// Helper function to create mock init context
const createMockInitContext = (sessionId: string): InitMessageContext => ({
  initMessage: {
    session_id: sessionId,
  },
});

// Helper function to create mock result message
const createMockResultMessage = (sessionId: string) => ({
  session_id: sessionId,
});

const serviceLayer = Layer.provide(ClaudeCodeSessionProcessService.Live, testPlatformLayer());

describe("ClaudeCodeSessionProcessService", () => {
  describe("startSessionProcess", () => {
    it.live("can start new session process in starting state", () =>
      Effect.gen(function* () {
        const service = yield* ClaudeCodeSessionProcessService;

        const sessionDef = createMockSessionProcessDef("process-1");
        const turnDef = createMockNewTaskDef("task-1", "session-abc");

        const result = yield* service.startSessionProcess({
          sessionDef,
          turnDef,
        });

        expect(result.sessionProcess.type).toBe("starting");
        expect(result.sessionProcess.def.sessionProcessId).toBe("process-1");
        expect(result.sessionProcess.sessionId).toBe("session-abc");
        expect(result.task.status).toBe("running");
        expect(result.task.def.turnId).toBe("task-1");
      }).pipe(Effect.provide(serviceLayer)),
    );

    it.live("creates session process with correct task structure", () =>
      Effect.gen(function* () {
        const service = yield* ClaudeCodeSessionProcessService;

        const sessionDef = createMockSessionProcessDef("process-1");
        const turnDef = createMockNewTaskDef("task-1");

        const result = yield* service.startSessionProcess({
          sessionDef,
          turnDef,
        });

        expect(result.sessionProcess.tasks).toHaveLength(1);
        expect(result.sessionProcess.currentTask).toBe(result.task);
        expect(result.sessionProcess.currentTask.def).toBe(turnDef);
      }).pipe(Effect.provide(serviceLayer)),
    );
  });

  describe("getSessionProcess", () => {
    it.live("can retrieve created session process", () =>
      Effect.gen(function* () {
        const service = yield* ClaudeCodeSessionProcessService;

        const sessionDef = createMockSessionProcessDef("process-1");
        const turnDef = createMockNewTaskDef("task-1");

        yield* service.startSessionProcess({
          sessionDef,
          turnDef,
        });

        const process = yield* service.getSessionProcess("process-1");

        expect(process.def.sessionProcessId).toBe("process-1");
        expect(process.type).toBe("starting");
      }).pipe(Effect.provide(serviceLayer)),
    );

    it.live("fails with SessionProcessNotFoundError for non-existent process", () =>
      Effect.gen(function* () {
        const service = yield* ClaudeCodeSessionProcessService;

        const result = yield* Effect.flip(service.getSessionProcess("non-existent"));

        expect(result).toMatchObject({
          _tag: "SessionProcessNotFoundError",
          sessionProcessId: "non-existent",
        });
      }).pipe(Effect.provide(serviceLayer)),
    );
  });

  describe("getSessionProcesses", () => {
    it.live("returns empty array when no processes exist", () =>
      Effect.gen(function* () {
        const service = yield* ClaudeCodeSessionProcessService;

        const processes = yield* service.getSessionProcesses();

        expect(processes).toHaveLength(0);
      }).pipe(Effect.provide(serviceLayer)),
    );

    it.live("returns all created processes", () =>
      Effect.gen(function* () {
        const service = yield* ClaudeCodeSessionProcessService;

        const sessionDef1 = createMockSessionProcessDef("process-1");
        const turnDef1 = createMockNewTaskDef("task-1");

        const sessionDef2 = createMockSessionProcessDef("process-2");
        const turnDef2 = createMockNewTaskDef("task-2");

        yield* service.startSessionProcess({
          sessionDef: sessionDef1,
          turnDef: turnDef1,
        });
        yield* service.startSessionProcess({
          sessionDef: sessionDef2,
          turnDef: turnDef2,
        });

        const processes = yield* service.getSessionProcesses();

        expect(processes).toHaveLength(2);
        expect(processes.map((p) => p.def.sessionProcessId)).toEqual(
          expect.arrayContaining(["process-1", "process-2"]),
        );
      }).pipe(Effect.provide(serviceLayer)),
    );
  });

  describe("continueSessionProcess", () => {
    it.live("can continue paused session process", () =>
      Effect.gen(function* () {
        const service = yield* ClaudeCodeSessionProcessService;

        // Start and progress to paused state
        const sessionDef = createMockSessionProcessDef("process-1");
        const turnDef = createMockNewTaskDef("task-1", "session-1");

        yield* service.startSessionProcess({
          sessionDef,
          turnDef,
        });

        yield* service.updateRawUserMessage({
          sessionProcessId: "process-1",
          rawUserMessage: "test message",
        });

        yield* service.toInitializedState({
          sessionProcessId: "process-1",
          initContext: createMockInitContext("session-1"),
        });

        yield* service.toFileCreatedState({
          sessionProcessId: "process-1",
        });

        yield* service.toPausedState({
          sessionProcessId: "process-1",
          resultMessage: createMockResultMessage("session-1"),
        });

        // Continue the paused process
        const continueTaskDef = createMockContinueTaskDef("task-2", "session-1", "session-1");

        const result = yield* service.continueSessionProcess({
          sessionProcessId: "process-1",
          turnDef: continueTaskDef,
        });

        expect(result.sessionProcess.type).toBe("starting");
        expect(result.task.def.turnId).toBe("task-2");
        expect(result.sessionProcess.tasks).toHaveLength(2);
      }).pipe(Effect.provide(serviceLayer)),
    );

    it.live("fails with SessionProcessNotPausedError when process is not paused", () =>
      Effect.gen(function* () {
        const service = yield* ClaudeCodeSessionProcessService;

        const sessionDef = createMockSessionProcessDef("process-1");
        const turnDef = createMockNewTaskDef("task-1");

        yield* service.startSessionProcess({
          sessionDef,
          turnDef,
        });

        const continueTaskDef = createMockContinueTaskDef("task-2", "session-1", "session-1");

        const result = yield* Effect.flip(
          service.continueSessionProcess({
            sessionProcessId: "process-1",
            turnDef: continueTaskDef,
          }),
        );

        expect(result).toMatchObject({
          _tag: "SessionProcessNotPausedError",
          sessionProcessId: "process-1",
        });
      }).pipe(Effect.provide(serviceLayer)),
    );

    it.live("fails with SessionProcessNotFoundError for non-existent process", () =>
      Effect.gen(function* () {
        const service = yield* ClaudeCodeSessionProcessService;

        const continueTaskDef = createMockContinueTaskDef("task-1", "session-1", "session-1");

        const result = yield* Effect.flip(
          service.continueSessionProcess({
            sessionProcessId: "non-existent",
            turnDef: continueTaskDef,
          }),
        );

        expect(result).toMatchObject({
          _tag: "SessionProcessNotFoundError",
          sessionProcessId: "non-existent",
        });
      }).pipe(Effect.provide(serviceLayer)),
    );
  });

  describe("updateRawUserMessage", () => {
    it.live("can update raw user message in starting state", () =>
      Effect.gen(function* () {
        const service = yield* ClaudeCodeSessionProcessService;

        const sessionDef = createMockSessionProcessDef("process-1");
        const turnDef = createMockNewTaskDef("task-1");

        yield* service.startSessionProcess({
          sessionDef,
          turnDef,
        });

        const result = yield* service.updateRawUserMessage({
          sessionProcessId: "process-1",
          rawUserMessage: "test message",
        });

        expect(result.sessionProcess.type).toBe("starting");
        expect(result.sessionProcess.rawUserMessage).toBe("test message");
      }).pipe(Effect.provide(serviceLayer)),
    );

    it.live("fails with IllegalStateChangeError when not in starting state", () =>
      Effect.gen(function* () {
        const service = yield* ClaudeCodeSessionProcessService;

        const sessionDef = createMockSessionProcessDef("process-1");
        const turnDef = createMockNewTaskDef("task-1");

        yield* service.startSessionProcess({
          sessionDef,
          turnDef,
        });

        yield* service.toInitializedState({
          sessionProcessId: "process-1",
          initContext: createMockInitContext("session-1"),
        });

        // Try to update raw user message in initialized state
        const result = yield* Effect.flip(
          service.updateRawUserMessage({
            sessionProcessId: "process-1",
            rawUserMessage: "test message 2",
          }),
        );

        expect(result).toMatchObject({
          _tag: "IllegalStateChangeError",
          from: "initialized",
          to: "starting",
        });
      }).pipe(Effect.provide(serviceLayer)),
    );
  });

  describe("toInitializedState", () => {
    it.live("can transition from starting to initialized", () =>
      Effect.gen(function* () {
        const service = yield* ClaudeCodeSessionProcessService;

        const sessionDef = createMockSessionProcessDef("process-1");
        const turnDef = createMockNewTaskDef("task-1", "session-1");

        yield* service.startSessionProcess({
          sessionDef,
          turnDef,
        });

        const initContext = createMockInitContext("session-1");

        const result = yield* service.toInitializedState({
          sessionProcessId: "process-1",
          initContext,
        });

        expect(result.sessionProcess.type).toBe("initialized");
        expect(result.sessionProcess.sessionId).toBe("session-1");
        expect(result.sessionProcess.initContext).toBeDefined();
      }).pipe(Effect.provide(serviceLayer)),
    );

    it.live("fails with IllegalStateChangeError when not in starting state", () =>
      Effect.gen(function* () {
        const service = yield* ClaudeCodeSessionProcessService;

        const sessionDef = createMockSessionProcessDef("process-1");
        const turnDef = createMockNewTaskDef("task-1");

        yield* service.startSessionProcess({
          sessionDef,
          turnDef,
        });

        yield* service.toInitializedState({
          sessionProcessId: "process-1",
          initContext: createMockInitContext("session-1"),
        });

        // Try to transition again from initialized
        const result = yield* Effect.flip(
          service.toInitializedState({
            sessionProcessId: "process-1",
            initContext: createMockInitContext("session-1"),
          }),
        );

        expect(result).toMatchObject({
          _tag: "IllegalStateChangeError",
          from: "initialized",
          to: "initialized",
        });
      }).pipe(Effect.provide(serviceLayer)),
    );
  });

  describe("toPausedState", () => {
    it.live("can transition from initialized to paused", () =>
      Effect.gen(function* () {
        const service = yield* ClaudeCodeSessionProcessService;

        const sessionDef = createMockSessionProcessDef("process-1");
        const turnDef = createMockNewTaskDef("task-1", "session-1");

        yield* service.startSessionProcess({
          sessionDef,
          turnDef,
        });

        yield* service.toInitializedState({
          sessionProcessId: "process-1",
          initContext: createMockInitContext("session-1"),
        });

        const resultMessage = createMockResultMessage("session-1");

        const result = yield* service.toPausedState({
          sessionProcessId: "process-1",
          resultMessage,
        });

        expect(result.sessionProcess.type).toBe("paused");
        expect(result.sessionProcess.sessionId).toBe("session-1");
      }).pipe(Effect.provide(serviceLayer)),
    );

    it.live("can transition from file_created to paused", () =>
      Effect.gen(function* () {
        const service = yield* ClaudeCodeSessionProcessService;

        const sessionDef = createMockSessionProcessDef("process-1");
        const turnDef = createMockNewTaskDef("task-1", "session-1");

        yield* service.startSessionProcess({
          sessionDef,
          turnDef,
        });

        yield* service.toInitializedState({
          sessionProcessId: "process-1",
          initContext: createMockInitContext("session-1"),
        });

        yield* service.toFileCreatedState({
          sessionProcessId: "process-1",
        });

        const resultMessage = createMockResultMessage("session-1");

        const result = yield* service.toPausedState({
          sessionProcessId: "process-1",
          resultMessage,
        });

        expect(result.sessionProcess.type).toBe("paused");
        expect(result.sessionProcess.sessionId).toBe("session-1");
      }).pipe(Effect.provide(serviceLayer)),
    );

    it.live("marks current task as completed", () =>
      Effect.gen(function* () {
        const service = yield* ClaudeCodeSessionProcessService;

        const sessionDef = createMockSessionProcessDef("process-1");
        const turnDef = createMockNewTaskDef("task-1", "session-1");

        yield* service.startSessionProcess({
          sessionDef,
          turnDef,
        });

        yield* service.toInitializedState({
          sessionProcessId: "process-1",
          initContext: createMockInitContext("session-1"),
        });

        yield* service.toFileCreatedState({
          sessionProcessId: "process-1",
        });

        yield* service.toPausedState({
          sessionProcessId: "process-1",
          resultMessage: createMockResultMessage("session-1"),
        });

        const process = yield* service.getSessionProcess("process-1");

        const completedTask = process.tasks.find((t) => t.def.turnId === "task-1");
        expect(completedTask?.status).toBe("completed");
        if (completedTask?.status !== "completed") {
          throw new Error("Expected completed task");
        }
        expect(completedTask.sessionId).toBe("session-1");
      }).pipe(Effect.provide(serviceLayer)),
    );

    it.live(
      "fails with IllegalStateChangeError when not in initialized or file_created state",
      () =>
        Effect.gen(function* () {
          const service = yield* ClaudeCodeSessionProcessService;

          const sessionDef = createMockSessionProcessDef("process-1");
          const turnDef = createMockNewTaskDef("task-1");

          yield* service.startSessionProcess({
            sessionDef,
            turnDef,
          });

          const result = yield* Effect.flip(
            service.toPausedState({
              sessionProcessId: "process-1",
              resultMessage: createMockResultMessage("session-1"),
            }),
          );

          expect(result).toMatchObject({
            _tag: "IllegalStateChangeError",
            from: "starting",
            to: "paused",
          });
        }).pipe(Effect.provide(serviceLayer)),
    );
  });

  describe("toCompletedState", () => {
    it.live("can transition to completed state from starting state", () =>
      Effect.gen(function* () {
        const service = yield* ClaudeCodeSessionProcessService;

        const sessionDef = createMockSessionProcessDef("process-1");
        const turnDef = createMockNewTaskDef("task-1");

        yield* service.startSessionProcess({
          sessionDef,
          turnDef,
        });

        const result = yield* service.toCompletedState({
          sessionProcessId: "process-1",
        });

        expect(result.sessionProcess.type).toBe("completed");
      }).pipe(Effect.provide(serviceLayer)),
    );

    it.live("marks current task as completed when no error", () =>
      Effect.gen(function* () {
        const service = yield* ClaudeCodeSessionProcessService;

        const sessionDef = createMockSessionProcessDef("process-1");
        const turnDef = createMockNewTaskDef("task-1", "session-1");

        yield* service.startSessionProcess({
          sessionDef,
          turnDef,
        });

        yield* service.toInitializedState({
          sessionProcessId: "process-1",
          initContext: createMockInitContext("session-1"),
        });

        const result = yield* service.toCompletedState({
          sessionProcessId: "process-1",
        });

        expect(result.task?.status).toBe("completed");
      }).pipe(Effect.provide(serviceLayer)),
    );

    it.live("marks current task as failed when error is provided", () =>
      Effect.gen(function* () {
        const service = yield* ClaudeCodeSessionProcessService;

        const sessionDef = createMockSessionProcessDef("process-1");
        const turnDef = createMockNewTaskDef("task-1");

        yield* service.startSessionProcess({
          sessionDef,
          turnDef,
        });

        const error = new Error("Test error");

        const result = yield* service.toCompletedState({
          sessionProcessId: "process-1",
          error,
        });

        expect(result.task?.status).toBe("failed");
        if (result.task?.status !== "failed") {
          throw new Error("Expected failed task");
        }
        expect(result.task.error).toBeInstanceOf(Error);
      }).pipe(Effect.provide(serviceLayer)),
    );

    it.live("sets abortedByUser to false by default", () =>
      Effect.gen(function* () {
        const service = yield* ClaudeCodeSessionProcessService;

        const sessionDef = createMockSessionProcessDef("process-1");
        const turnDef = createMockNewTaskDef("task-1");

        yield* service.startSessionProcess({
          sessionDef,
          turnDef,
        });

        const result = yield* service.toCompletedState({
          sessionProcessId: "process-1",
        });

        expect(result.sessionProcess.type).toBe("completed");
        if (result.sessionProcess.type !== "completed") {
          throw new Error("Expected completed state");
        }
        expect(result.sessionProcess.abortedByUser).toBe(false);
      }).pipe(Effect.provide(serviceLayer)),
    );

    it.live("sets abortedByUser to true when specified", () =>
      Effect.gen(function* () {
        const service = yield* ClaudeCodeSessionProcessService;

        const sessionDef = createMockSessionProcessDef("process-1");
        const turnDef = createMockNewTaskDef("task-1");

        yield* service.startSessionProcess({
          sessionDef,
          turnDef,
        });

        const result = yield* service.toCompletedState({
          sessionProcessId: "process-1",
          abortedByUser: true,
        });

        expect(result.sessionProcess.type).toBe("completed");
        if (result.sessionProcess.type !== "completed") {
          throw new Error("Expected completed state");
        }
        expect(result.sessionProcess.abortedByUser).toBe(true);
      }).pipe(Effect.provide(serviceLayer)),
    );
  });

  describe("getTask", () => {
    it.live("can retrieve task by turnId", () =>
      Effect.gen(function* () {
        const service = yield* ClaudeCodeSessionProcessService;

        const sessionDef = createMockSessionProcessDef("process-1");
        const turnDef = createMockNewTaskDef("task-1");

        yield* service.startSessionProcess({
          sessionDef,
          turnDef,
        });

        const result = yield* service.getTask("task-1");

        expect(result.task.def.turnId).toBe("task-1");
        expect(result.sessionProcess.def.sessionProcessId).toBe("process-1");
      }).pipe(Effect.provide(serviceLayer)),
    );

    it.live("fails with TaskNotFoundError for non-existent task", () =>
      Effect.gen(function* () {
        const service = yield* ClaudeCodeSessionProcessService;

        const result = yield* Effect.flip(service.getTask("non-existent-task"));

        expect(result).toMatchObject({
          _tag: "TaskNotFoundError",
          turnId: "non-existent-task",
        });
      }).pipe(Effect.provide(serviceLayer)),
    );
  });

  describe("state transitions flow", () => {
    it.live("can complete full lifecycle: starting -> initialized -> file_created -> paused", () =>
      Effect.gen(function* () {
        const service = yield* ClaudeCodeSessionProcessService;

        const sessionDef = createMockSessionProcessDef("process-1");
        const turnDef = createMockNewTaskDef("task-1", "session-1");

        const startResult = yield* service.startSessionProcess({
          sessionDef,
          turnDef,
        });
        expect(startResult.sessionProcess.type).toBe("starting");

        yield* service.updateRawUserMessage({
          sessionProcessId: "process-1",
          rawUserMessage: "test message",
        });

        const initResult = yield* service.toInitializedState({
          sessionProcessId: "process-1",
          initContext: createMockInitContext("session-1"),
        });
        expect(initResult.sessionProcess.type).toBe("initialized");

        const fileCreatedResult = yield* service.toFileCreatedState({
          sessionProcessId: "process-1",
        });
        expect(fileCreatedResult.sessionProcess.type).toBe("file_created");

        const pausedResult = yield* service.toPausedState({
          sessionProcessId: "process-1",
          resultMessage: createMockResultMessage("session-1"),
        });
        expect(pausedResult.sessionProcess.type).toBe("paused");

        expect(pausedResult.sessionProcess.type).toBe("paused");
        expect(pausedResult.sessionProcess.sessionId).toBe("session-1");
      }).pipe(Effect.provide(serviceLayer)),
    );

    it.live("can continue paused process and complete another task", () =>
      Effect.gen(function* () {
        const service = yield* ClaudeCodeSessionProcessService;

        // First task lifecycle
        const sessionDef = createMockSessionProcessDef("process-1");
        const turnDef1 = createMockNewTaskDef("task-1", "session-1");

        yield* service.startSessionProcess({
          sessionDef,
          turnDef: turnDef1,
        });

        yield* service.toInitializedState({
          sessionProcessId: "process-1",
          initContext: createMockInitContext("session-1"),
        });

        yield* service.toFileCreatedState({
          sessionProcessId: "process-1",
        });

        yield* service.toPausedState({
          sessionProcessId: "process-1",
          resultMessage: createMockResultMessage("session-1"),
        });

        // Continue with second task
        const turnDef2 = createMockContinueTaskDef("task-2", "session-1", "session-1");

        const continueResult = yield* service.continueSessionProcess({
          sessionProcessId: "process-1",
          turnDef: turnDef2,
        });
        expect(continueResult.sessionProcess.type).toBe("starting");

        yield* service.toInitializedState({
          sessionProcessId: "process-1",
          initContext: createMockInitContext("session-1"),
        });

        yield* service.toFileCreatedState({
          sessionProcessId: "process-1",
        });

        const finalResult = yield* service.toPausedState({
          sessionProcessId: "process-1",
          resultMessage: createMockResultMessage("session-1"),
        });

        expect(finalResult.sessionProcess.type).toBe("paused");
        expect(finalResult.sessionProcess.tasks).toHaveLength(2);
        expect(
          finalResult.sessionProcess.tasks.filter((t) => t.status === "completed"),
        ).toHaveLength(2);
      }).pipe(Effect.provide(serviceLayer)),
    );
  });
});
