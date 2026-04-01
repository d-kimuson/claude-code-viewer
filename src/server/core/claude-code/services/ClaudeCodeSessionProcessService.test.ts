import { Effect } from "effect";
import { describe, expect, it } from "vitest";
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

describe("ClaudeCodeSessionProcessService", () => {
  describe("startSessionProcess", () => {
    it("can start new session process in starting state", async () => {
      const program = Effect.gen(function* () {
        const service = yield* ClaudeCodeSessionProcessService;

        const sessionDef = createMockSessionProcessDef("process-1");
        const turnDef = createMockNewTaskDef("task-1", "session-abc");

        const result = yield* service.startSessionProcess({
          sessionDef,
          turnDef,
        });

        return result;
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(ClaudeCodeSessionProcessService.Live),
          Effect.provide(testPlatformLayer()),
        ),
      );

      expect(result.sessionProcess.type).toBe("starting");
      expect(result.sessionProcess.def.sessionProcessId).toBe("process-1");
      expect(result.sessionProcess.sessionId).toBe("session-abc");
      expect(result.task.status).toBe("running");
      expect(result.task.def.turnId).toBe("task-1");
    });

    it("creates session process with correct task structure", async () => {
      const program = Effect.gen(function* () {
        const service = yield* ClaudeCodeSessionProcessService;

        const sessionDef = createMockSessionProcessDef("process-1");
        const turnDef = createMockNewTaskDef("task-1");

        const result = yield* service.startSessionProcess({
          sessionDef,
          turnDef,
        });

        return { result, turnDef };
      });

      const { result, turnDef } = await Effect.runPromise(
        program.pipe(
          Effect.provide(ClaudeCodeSessionProcessService.Live),
          Effect.provide(testPlatformLayer()),
        ),
      );

      expect(result.sessionProcess.tasks).toHaveLength(1);
      expect(result.sessionProcess.currentTask).toBe(result.task);
      expect(result.sessionProcess.currentTask.def).toBe(turnDef);
    });
  });

  describe("getSessionProcess", () => {
    it("can retrieve created session process", async () => {
      const program = Effect.gen(function* () {
        const service = yield* ClaudeCodeSessionProcessService;

        const sessionDef = createMockSessionProcessDef("process-1");
        const turnDef = createMockNewTaskDef("task-1");

        yield* service.startSessionProcess({
          sessionDef,
          turnDef,
        });

        const process = yield* service.getSessionProcess("process-1");

        return process;
      });

      const process = await Effect.runPromise(
        program.pipe(
          Effect.provide(ClaudeCodeSessionProcessService.Live),
          Effect.provide(testPlatformLayer()),
        ),
      );

      expect(process.def.sessionProcessId).toBe("process-1");
      expect(process.type).toBe("starting");
    });

    it("fails with SessionProcessNotFoundError for non-existent process", async () => {
      const program = Effect.gen(function* () {
        const service = yield* ClaudeCodeSessionProcessService;

        const result = yield* Effect.flip(service.getSessionProcess("non-existent"));

        return result;
      });

      const error = await Effect.runPromise(
        program.pipe(
          Effect.provide(ClaudeCodeSessionProcessService.Live),
          Effect.provide(testPlatformLayer()),
        ),
      );

      expect(error).toMatchObject({
        _tag: "SessionProcessNotFoundError",
        sessionProcessId: "non-existent",
      });
    });
  });

  describe("getSessionProcesses", () => {
    it("returns empty array when no processes exist", async () => {
      const program = Effect.gen(function* () {
        const service = yield* ClaudeCodeSessionProcessService;

        const processes = yield* service.getSessionProcesses();

        return processes;
      });

      const processes = await Effect.runPromise(
        program.pipe(
          Effect.provide(ClaudeCodeSessionProcessService.Live),
          Effect.provide(testPlatformLayer()),
        ),
      );

      expect(processes).toHaveLength(0);
    });

    it("returns all created processes", async () => {
      const program = Effect.gen(function* () {
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

        return processes;
      });

      const processes = await Effect.runPromise(
        program.pipe(
          Effect.provide(ClaudeCodeSessionProcessService.Live),
          Effect.provide(testPlatformLayer()),
        ),
      );

      expect(processes).toHaveLength(2);
      expect(processes.map((p) => p.def.sessionProcessId)).toEqual(
        expect.arrayContaining(["process-1", "process-2"]),
      );
    });
  });

  describe("continueSessionProcess", () => {
    it("can continue paused session process", async () => {
      const program = Effect.gen(function* () {
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

        return result;
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(ClaudeCodeSessionProcessService.Live),
          Effect.provide(testPlatformLayer()),
        ),
      );

      expect(result.sessionProcess.type).toBe("starting");
      expect(result.task.def.turnId).toBe("task-2");
      expect(result.sessionProcess.tasks).toHaveLength(2);
    });

    it("fails with SessionProcessNotPausedError when process is not paused", async () => {
      const program = Effect.gen(function* () {
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

        return result;
      });

      const error = await Effect.runPromise(
        program.pipe(
          Effect.provide(ClaudeCodeSessionProcessService.Live),
          Effect.provide(testPlatformLayer()),
        ),
      );

      expect(error).toMatchObject({
        _tag: "SessionProcessNotPausedError",
        sessionProcessId: "process-1",
      });
    });

    it("fails with SessionProcessNotFoundError for non-existent process", async () => {
      const program = Effect.gen(function* () {
        const service = yield* ClaudeCodeSessionProcessService;

        const continueTaskDef = createMockContinueTaskDef("task-1", "session-1", "session-1");

        const result = yield* Effect.flip(
          service.continueSessionProcess({
            sessionProcessId: "non-existent",
            turnDef: continueTaskDef,
          }),
        );

        return result;
      });

      const error = await Effect.runPromise(
        program.pipe(
          Effect.provide(ClaudeCodeSessionProcessService.Live),
          Effect.provide(testPlatformLayer()),
        ),
      );

      expect(error).toMatchObject({
        _tag: "SessionProcessNotFoundError",
        sessionProcessId: "non-existent",
      });
    });
  });

  describe("updateRawUserMessage", () => {
    it("can update raw user message in starting state", async () => {
      const program = Effect.gen(function* () {
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

        return result;
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(ClaudeCodeSessionProcessService.Live),
          Effect.provide(testPlatformLayer()),
        ),
      );

      expect(result.sessionProcess.type).toBe("starting");
      expect(result.sessionProcess.rawUserMessage).toBe("test message");
    });

    it("fails with IllegalStateChangeError when not in starting state", async () => {
      const program = Effect.gen(function* () {
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

        return result;
      });

      const error = await Effect.runPromise(
        program.pipe(
          Effect.provide(ClaudeCodeSessionProcessService.Live),
          Effect.provide(testPlatformLayer()),
        ),
      );

      expect(error).toMatchObject({
        _tag: "IllegalStateChangeError",
        from: "initialized",
        to: "starting",
      });
    });
  });

  describe("toInitializedState", () => {
    it("can transition from starting to initialized", async () => {
      const program = Effect.gen(function* () {
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

        return result;
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(ClaudeCodeSessionProcessService.Live),
          Effect.provide(testPlatformLayer()),
        ),
      );

      expect(result.sessionProcess.type).toBe("initialized");
      expect(result.sessionProcess.sessionId).toBe("session-1");
      expect(result.sessionProcess.initContext).toBeDefined();
    });

    it("fails with IllegalStateChangeError when not in starting state", async () => {
      const program = Effect.gen(function* () {
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

        return result;
      });

      const error = await Effect.runPromise(
        program.pipe(
          Effect.provide(ClaudeCodeSessionProcessService.Live),
          Effect.provide(testPlatformLayer()),
        ),
      );

      expect(error).toMatchObject({
        _tag: "IllegalStateChangeError",
        from: "initialized",
        to: "initialized",
      });
    });
  });

  describe("toPausedState", () => {
    it("can transition from initialized to paused", async () => {
      const program = Effect.gen(function* () {
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

        return result;
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(ClaudeCodeSessionProcessService.Live),
          Effect.provide(testPlatformLayer()),
        ),
      );

      expect(result.sessionProcess.type).toBe("paused");
      expect(result.sessionProcess.sessionId).toBe("session-1");
    });

    it("can transition from file_created to paused", async () => {
      const program = Effect.gen(function* () {
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

        return result;
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(ClaudeCodeSessionProcessService.Live),
          Effect.provide(testPlatformLayer()),
        ),
      );

      expect(result.sessionProcess.type).toBe("paused");
      expect(result.sessionProcess.sessionId).toBe("session-1");
    });

    it("marks current task as completed", async () => {
      const program = Effect.gen(function* () {
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

        return process;
      });

      const process = await Effect.runPromise(
        program.pipe(
          Effect.provide(ClaudeCodeSessionProcessService.Live),
          Effect.provide(testPlatformLayer()),
        ),
      );

      const completedTask = process.tasks.find((t) => t.def.turnId === "task-1");
      expect(completedTask?.status).toBe("completed");
      if (completedTask?.status !== "completed") {
        throw new Error("Expected completed task");
      }
      expect(completedTask.sessionId).toBe("session-1");
    });

    it("fails with IllegalStateChangeError when not in initialized or file_created state", async () => {
      const program = Effect.gen(function* () {
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

        return result;
      });

      const error = await Effect.runPromise(
        program.pipe(
          Effect.provide(ClaudeCodeSessionProcessService.Live),
          Effect.provide(testPlatformLayer()),
        ),
      );

      expect(error).toMatchObject({
        _tag: "IllegalStateChangeError",
        from: "starting",
        to: "paused",
      });
    });
  });

  describe("toCompletedState", () => {
    it("can transition to completed state from starting state", async () => {
      const program = Effect.gen(function* () {
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

        return result;
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(ClaudeCodeSessionProcessService.Live),
          Effect.provide(testPlatformLayer()),
        ),
      );

      expect(result.sessionProcess.type).toBe("completed");
    });

    it("marks current task as completed when no error", async () => {
      const program = Effect.gen(function* () {
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

        return result;
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(ClaudeCodeSessionProcessService.Live),
          Effect.provide(testPlatformLayer()),
        ),
      );

      expect(result.task?.status).toBe("completed");
    });

    it("marks current task as failed when error is provided", async () => {
      const program = Effect.gen(function* () {
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

        return result;
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(ClaudeCodeSessionProcessService.Live),
          Effect.provide(testPlatformLayer()),
        ),
      );

      expect(result.task?.status).toBe("failed");
      if (result.task?.status !== "failed") {
        throw new Error("Expected failed task");
      }
      expect(result.task.error).toBeInstanceOf(Error);
    });
  });

  describe("getTask", () => {
    it("can retrieve task by turnId", async () => {
      const program = Effect.gen(function* () {
        const service = yield* ClaudeCodeSessionProcessService;

        const sessionDef = createMockSessionProcessDef("process-1");
        const turnDef = createMockNewTaskDef("task-1");

        yield* service.startSessionProcess({
          sessionDef,
          turnDef,
        });

        const result = yield* service.getTask("task-1");

        return result;
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(ClaudeCodeSessionProcessService.Live),
          Effect.provide(testPlatformLayer()),
        ),
      );

      expect(result.task.def.turnId).toBe("task-1");
      expect(result.sessionProcess.def.sessionProcessId).toBe("process-1");
    });

    it("fails with TaskNotFoundError for non-existent task", async () => {
      const program = Effect.gen(function* () {
        const service = yield* ClaudeCodeSessionProcessService;

        const result = yield* Effect.flip(service.getTask("non-existent-task"));

        return result;
      });

      const error = await Effect.runPromise(
        program.pipe(
          Effect.provide(ClaudeCodeSessionProcessService.Live),
          Effect.provide(testPlatformLayer()),
        ),
      );

      expect(error).toMatchObject({
        _tag: "TaskNotFoundError",
        turnId: "non-existent-task",
      });
    });
  });

  describe("state transitions flow", () => {
    it("can complete full lifecycle: starting -> initialized -> file_created -> paused", async () => {
      const program = Effect.gen(function* () {
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

        return pausedResult;
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(ClaudeCodeSessionProcessService.Live),
          Effect.provide(testPlatformLayer()),
        ),
      );

      expect(result.sessionProcess.type).toBe("paused");
      expect(result.sessionProcess.sessionId).toBe("session-1");
    });

    it("can continue paused process and complete another task", async () => {
      const program = Effect.gen(function* () {
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

        return finalResult;
      });

      const result = await Effect.runPromise(
        program.pipe(
          Effect.provide(ClaudeCodeSessionProcessService.Live),
          Effect.provide(testPlatformLayer()),
        ),
      );

      expect(result.sessionProcess.type).toBe("paused");
      expect(result.sessionProcess.tasks).toHaveLength(2);
      expect(result.sessionProcess.tasks.filter((t) => t.status === "completed")).toHaveLength(2);
    });
  });
});
