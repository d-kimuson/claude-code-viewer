import { Context, Data, Effect, Layer, Ref } from "effect";
import type { InferEffect } from "../../../lib/effect/types.ts";
import { EventBus } from "../../events/services/EventBus.ts";
import * as CCSessionProcess from "../models/CCSessionProcess.ts";
import type * as CCTurn from "../models/ClaudeCodeTurn.ts";
import type { InitMessageContext } from "../types.ts";

class SessionProcessNotFoundError extends Data.TaggedError("SessionProcessNotFoundError")<{
  sessionProcessId: string;
}> {}

class SessionProcessNotPausedError extends Data.TaggedError("SessionProcessNotPausedError")<{
  sessionProcessId: string;
}> {}

class SessionProcessAlreadyAliveError extends Data.TaggedError("SessionProcessAlreadyAliveError")<{
  sessionProcessId: string;
  aliveTaskId: string;
  aliveTaskSessionId?: string;
}> {}

class IllegalStateChangeError extends Data.TaggedError("IllegalStateChangeError")<{
  from: CCSessionProcess.CCSessionProcessState["type"];
  to: CCSessionProcess.CCSessionProcessState["type"];
}> {}

class TaskNotFoundError extends Data.TaggedError("TaskNotFoundError")<{
  turnId: string;
}> {}

const LayerImpl = Effect.gen(function* () {
  const processesRef = yield* Ref.make<CCSessionProcess.CCSessionProcessState[]>([]);
  const eventBus = yield* EventBus;

  const emitSessionProcessChanged = (changed: CCSessionProcess.CCSessionProcessState) =>
    Effect.gen(function* () {
      const processes = yield* Ref.get(processesRef);
      const publicProcesses = processes.filter(CCSessionProcess.isPublic).map((process) => ({
        id: process.def.sessionProcessId,
        projectId: process.def.projectId,
        sessionId: process.sessionId,
        status: process.type === "paused" ? ("paused" as const) : ("running" as const),
      }));

      yield* eventBus.emit("sessionProcessChanged", {
        processes: publicProcesses,
        changed,
      });
    });

  const startSessionProcess = (options: {
    sessionDef: CCSessionProcess.CCSessionProcessDef;
    turnDef: CCTurn.NewClaudeCodeTurnDef | CCTurn.ResumeClaudeCodeTurnDef;
  }) => {
    const { sessionDef, turnDef } = options;

    return Effect.gen(function* () {
      const task: CCTurn.RunningClaudeCodeTurnState = {
        def: turnDef,
        status: "running",
      };

      const newProcess: CCSessionProcess.CCSessionProcessStartingState = {
        def: sessionDef,
        type: "starting",
        sessionId: turnDef.sessionId,
        tasks: [task],
        currentTask: task,
        rawUserMessage: "", // Will be set when message is resolved
      };

      yield* Ref.update(processesRef, (processes) => [...processes, newProcess]);

      yield* emitSessionProcessChanged(newProcess);

      return {
        sessionProcess: newProcess,
        task,
      };
    });
  };

  const continueSessionProcess = (options: {
    sessionProcessId: string;
    turnDef: CCTurn.ContinueClaudeCodeTurnDef;
  }) => {
    const { sessionProcessId } = options;

    return Effect.gen(function* () {
      const process = yield* getSessionProcess(sessionProcessId);

      if (process.type !== "paused") {
        return yield* Effect.fail(
          new SessionProcessNotPausedError({
            sessionProcessId,
          }),
        );
      }

      const [firstAliveTask] = CCSessionProcess.getAliveTasks(process);
      if (firstAliveTask !== undefined) {
        return yield* Effect.fail(
          new SessionProcessAlreadyAliveError({
            sessionProcessId,
            aliveTaskId: firstAliveTask.def.turnId,
            aliveTaskSessionId: firstAliveTask.def.sessionId,
          }),
        );
      }

      const newTask: CCTurn.RunningClaudeCodeTurnState = {
        def: options.turnDef,
        status: "running",
      };

      const newProcess: CCSessionProcess.CCSessionProcessStartingState = {
        def: process.def,
        type: "starting",
        sessionId: process.sessionId,
        tasks: [...process.tasks, newTask],
        currentTask: newTask,
        rawUserMessage: "", // Will be set when message is resolved
      };

      yield* Ref.update(processesRef, (processes) => {
        return processes.map((p) => (p.def.sessionProcessId === sessionProcessId ? newProcess : p));
      });

      yield* emitSessionProcessChanged(newProcess);

      return {
        sessionProcess: newProcess,
        task: newTask,
      };
    });
  };

  const getSessionProcess = (sessionProcessId: string) => {
    return Effect.gen(function* () {
      const processes = yield* Ref.get(processesRef);
      const result = processes.find((p) => p.def.sessionProcessId === sessionProcessId);
      if (result === undefined) {
        return yield* Effect.fail(new SessionProcessNotFoundError({ sessionProcessId }));
      }
      return result;
    });
  };

  const getSessionProcesses = () => {
    return Effect.gen(function* () {
      const processes = yield* Ref.get(processesRef);
      return processes;
    });
  };

  const getTask = (turnId: string) => {
    return Effect.gen(function* () {
      const processes = yield* Ref.get(processesRef);
      const result = processes
        .flatMap((p) => {
          const found = p.tasks.find((t) => t.def.turnId === turnId);
          if (found === undefined) {
            return [];
          }

          return [
            {
              sessionProcess: p,
              task: found,
            },
          ];
        })
        .at(0);

      if (result === undefined) {
        return yield* Effect.fail(new TaskNotFoundError({ turnId }));
      }

      return result;
    });
  };

  const dangerouslyChangeProcessState = <
    T extends CCSessionProcess.CCSessionProcessState,
  >(options: {
    sessionProcessId: string;
    nextState: T;
  }) => {
    const { sessionProcessId, nextState } = options;

    return Effect.gen(function* () {
      const processes = yield* Ref.get(processesRef);
      const targetProcess = processes.find((p) => p.def.sessionProcessId === sessionProcessId);
      const currentStatus = targetProcess?.type;

      const updatedProcesses = processes.map((p) =>
        p.def.sessionProcessId === sessionProcessId ? nextState : p,
      );

      yield* Ref.set(processesRef, updatedProcesses);

      if (currentStatus !== nextState.type) {
        yield* eventBus.emit("sessionProcessChanged", {
          processes: updatedProcesses.filter(CCSessionProcess.isPublic).map((process) => ({
            id: process.def.sessionProcessId,
            projectId: process.def.projectId,
            sessionId: process.sessionId,
            status: process.type === "paused" ? "paused" : "running",
          })),
          changed: nextState,
        });
      }

      console.log(
        `sessionProcessStateChanged(${sessionProcessId}): ${targetProcess?.type} -> ${nextState.type}`,
      );

      return nextState;
    });
  };

  const changeTurnState = <T extends CCTurn.ClaudeCodeTurnState>(options: {
    sessionProcessId: string;
    turnId: string;
    nextTask: T;
  }) => {
    const { sessionProcessId, turnId, nextTask } = options;

    return Effect.gen(function* () {
      const { task } = yield* getTask(turnId);

      yield* Ref.update(processesRef, (processes) => {
        return processes.map((p) =>
          p.def.sessionProcessId === sessionProcessId
            ? {
                ...p,
                tasks: p.tasks.map((t) => (t.def.turnId === task.def.turnId ? { ...nextTask } : t)),
              }
            : p,
        );
      });

      const updated = yield* getTask(turnId);
      if (updated === undefined) {
        throw new Error("Unreachable: updatedProcess is undefined");
      }

      // oxlint-disable-next-line typescript-eslint/no-unsafe-type-assertion -- generic task type is narrowed by caller
      return updated.task as T;
    });
  };

  const updateRawUserMessage = (options: { sessionProcessId: string; rawUserMessage: string }) => {
    const { sessionProcessId, rawUserMessage } = options;

    return Effect.gen(function* () {
      const currentProcess = yield* getSessionProcess(sessionProcessId);

      if (currentProcess.type !== "starting") {
        return yield* Effect.fail(
          new IllegalStateChangeError({
            from: currentProcess.type,
            to: "starting",
          }),
        );
      }

      const newProcess = yield* dangerouslyChangeProcessState({
        sessionProcessId,
        nextState: {
          ...currentProcess,
          rawUserMessage,
        },
      });

      return {
        sessionProcess: newProcess,
      };
    });
  };

  const toInitializedState = (options: {
    sessionProcessId: string;
    initContext: InitMessageContext;
  }) => {
    const { sessionProcessId, initContext } = options;

    return Effect.gen(function* () {
      const currentProcess = yield* getSessionProcess(sessionProcessId);
      if (currentProcess.type !== "starting") {
        return yield* Effect.fail(
          new IllegalStateChangeError({
            from: currentProcess.type,
            to: "initialized",
          }),
        );
      }

      const newProcess = yield* dangerouslyChangeProcessState({
        sessionProcessId,
        nextState: {
          type: "initialized",
          def: currentProcess.def,
          tasks: currentProcess.tasks,
          currentTask: currentProcess.currentTask,
          sessionId: currentProcess.sessionId,
          rawUserMessage: currentProcess.rawUserMessage,
          initContext: initContext,
        },
      });

      return {
        sessionProcess: newProcess,
      };
    });
  };

  const toFileCreatedState = (options: { sessionProcessId: string }) => {
    const { sessionProcessId } = options;

    return Effect.gen(function* () {
      const currentProcess = yield* getSessionProcess(sessionProcessId);

      if (currentProcess.type !== "initialized") {
        return yield* Effect.fail(
          new IllegalStateChangeError({
            from: currentProcess.type,
            to: "file_created",
          }),
        );
      }

      const newProcess = yield* dangerouslyChangeProcessState({
        sessionProcessId,
        nextState: {
          type: "file_created",
          def: currentProcess.def,
          tasks: currentProcess.tasks,
          currentTask: currentProcess.currentTask,
          sessionId: currentProcess.sessionId,
          rawUserMessage: currentProcess.rawUserMessage,
          initContext: currentProcess.initContext,
        },
      });

      return {
        sessionProcess: newProcess,
      };
    });
  };

  const toPausedState = (options: {
    sessionProcessId: string;
    resultMessage: {
      session_id: string;
    };
  }) => {
    const { sessionProcessId, resultMessage } = options;

    return Effect.gen(function* () {
      const currentProcess = yield* getSessionProcess(sessionProcessId);
      if (currentProcess.type !== "file_created" && currentProcess.type !== "initialized") {
        return yield* Effect.fail(
          new IllegalStateChangeError({
            from: currentProcess.type,
            to: "paused",
          }),
        );
      }

      const newTask = yield* changeTurnState({
        sessionProcessId,
        turnId: currentProcess.currentTask.def.turnId,
        nextTask: {
          status: "completed",
          def: currentProcess.currentTask.def,
          sessionId: resultMessage.session_id,
        },
      });

      const newProcess = yield* dangerouslyChangeProcessState({
        sessionProcessId,
        nextState: {
          type: "paused",
          def: currentProcess.def,
          tasks: currentProcess.tasks.map((t) =>
            t.def.turnId === newTask.def.turnId ? newTask : t,
          ),
          sessionId: currentProcess.sessionId,
        },
      });

      return {
        sessionProcess: newProcess,
      };
    });
  };

  const toCompletedState = (options: { sessionProcessId: string; error?: unknown }) => {
    const { sessionProcessId, error } = options;

    return Effect.gen(function* () {
      const currentProcess = yield* getSessionProcess(sessionProcessId);

      const currentTask =
        currentProcess.type === "starting" ||
        currentProcess.type === "initialized" ||
        currentProcess.type === "file_created"
          ? currentProcess.currentTask
          : undefined;

      const newTask =
        currentTask !== undefined
          ? error !== undefined
            ? ({
                status: "failed",
                def: currentTask.def,
                error,
              } as const)
            : ({
                status: "completed",
                def: currentTask.def,
                sessionId: currentProcess.sessionId,
              } as const)
          : undefined;

      if (newTask !== undefined) {
        yield* changeTurnState({
          sessionProcessId,
          turnId: newTask.def.turnId,
          nextTask: newTask,
        });
      }

      const newProcess = yield* dangerouslyChangeProcessState({
        sessionProcessId,
        nextState: {
          type: "completed",
          def: currentProcess.def,
          tasks:
            newTask !== undefined
              ? currentProcess.tasks.map((t) => (t.def.turnId === newTask.def.turnId ? newTask : t))
              : currentProcess.tasks,
          sessionId: currentProcess.sessionId,
        },
      });

      return {
        sessionProcess: newProcess,
        task: newTask,
      };
    });
  };

  return {
    // session
    startSessionProcess,
    continueSessionProcess,
    updateRawUserMessage,
    toInitializedState,
    toFileCreatedState,
    toPausedState,
    toCompletedState,
    dangerouslyChangeProcessState,
    getSessionProcesses,
    getSessionProcess,

    // task
    getTask,
    changeTurnState,
  };
});

export type IClaudeCodeSessionProcessService = InferEffect<typeof LayerImpl>;

export class ClaudeCodeSessionProcessService extends Context.Tag("ClaudeCodeSessionProcessService")<
  ClaudeCodeSessionProcessService,
  IClaudeCodeSessionProcessService
>() {
  static Live = Layer.effect(this, LayerImpl);
}
