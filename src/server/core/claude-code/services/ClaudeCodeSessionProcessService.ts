import type { SDKResultMessage } from "@anthropic-ai/claude-code";
import { Context, Data, Effect, Layer, Ref } from "effect";
import type { InferEffect } from "../../../lib/effect/types";
import { EventBus } from "../../events/services/EventBus";
import * as CCSessionProcess from "../models/CCSessionProcess";
import type * as CCTask from "../models/ClaudeCodeTask";
import type { InitMessageContext } from "../types";

class SessionProcessNotFoundError extends Data.TaggedError(
  "SessionProcessNotFoundError",
)<{
  sessionProcessId: string;
}> {}

class SessionProcessNotPausedError extends Data.TaggedError(
  "SessionProcessNotPausedError",
)<{
  sessionProcessId: string;
}> {}

class SessionProcessAlreadyAliveError extends Data.TaggedError(
  "SessionProcessAlreadyAliveError",
)<{
  sessionProcessId: string;
  aliveTaskId: string;
  aliveTaskSessionId?: string;
}> {}

class IllegalStateChangeError extends Data.TaggedError(
  "IllegalStateChangeError",
)<{
  from: CCSessionProcess.CCSessionProcessState["type"];
  to: CCSessionProcess.CCSessionProcessState["type"];
}> {}

class TaskNotFoundError extends Data.TaggedError("TaskNotFoundError")<{
  taskId: string;
}> {}

const LayerImpl = Effect.gen(function* () {
  const processesRef = yield* Ref.make<
    CCSessionProcess.CCSessionProcessState[]
  >([]);
  const eventBus = yield* EventBus;

  const startSessionProcess = (options: {
    sessionDef: CCSessionProcess.CCSessionProcessDef;
    taskDef: CCTask.NewClaudeCodeTaskDef | CCTask.ResumeClaudeCodeTaskDef;
  }) => {
    const { sessionDef, taskDef } = options;

    return Effect.gen(function* () {
      const task: CCTask.PendingClaudeCodeTaskState = {
        def: taskDef,
        status: "pending",
      };

      const newProcess: CCSessionProcess.CCSessionProcessState = {
        def: sessionDef,
        type: "pending",
        tasks: [task],
        currentTask: task,
      };

      yield* Ref.update(processesRef, (processes) => [
        ...processes,
        newProcess,
      ]);
      return {
        sessionProcess: newProcess,
        task,
      };
    });
  };

  const continueSessionProcess = (options: {
    sessionProcessId: string;
    taskDef: CCTask.ContinueClaudeCodeTaskDef;
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
            aliveTaskId: firstAliveTask.def.taskId,
            aliveTaskSessionId:
              firstAliveTask.def.sessionId ?? firstAliveTask.sessionId,
          }),
        );
      }

      const newTask: CCTask.PendingClaudeCodeTaskState = {
        def: options.taskDef,
        status: "pending",
      };

      const newProcess: CCSessionProcess.CCSessionProcessPendingState = {
        def: process.def,
        type: "pending",
        tasks: [...process.tasks, newTask],
        currentTask: newTask,
      };

      yield* Ref.update(processesRef, (processes) => {
        return processes.map((p) =>
          p.def.sessionProcessId === sessionProcessId ? newProcess : p,
        );
      });

      return {
        sessionProcess: newProcess,
        task: newTask,
      };
    });
  };

  const getSessionProcess = (sessionProcessId: string) => {
    return Effect.gen(function* () {
      const processes = yield* Ref.get(processesRef);
      const result = processes.find(
        (p) => p.def.sessionProcessId === sessionProcessId,
      );
      if (result === undefined) {
        return yield* Effect.fail(
          new SessionProcessNotFoundError({ sessionProcessId }),
        );
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

  const getTask = (taskId: string) => {
    return Effect.gen(function* () {
      const processes = yield* Ref.get(processesRef);
      const result = processes
        .flatMap((p) => {
          const found = p.tasks.find((t) => t.def.taskId === taskId);
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
        return yield* Effect.fail(new TaskNotFoundError({ taskId }));
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
      const targetProcess = processes.find(
        (p) => p.def.sessionProcessId === sessionProcessId,
      );
      const currentStatus = targetProcess?.type;

      const updatedProcesses = processes.map((p) =>
        p.def.sessionProcessId === sessionProcessId ? nextState : p,
      );

      yield* Ref.set(processesRef, updatedProcesses);

      if (currentStatus !== nextState.type) {
        yield* eventBus.emit("sessionProcessChanged", {
          processes: updatedProcesses
            .filter(CCSessionProcess.isPublic)
            .map((process) => ({
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

  const changeTaskState = <T extends CCTask.ClaudeCodeTaskState>(options: {
    sessionProcessId: string;
    taskId: string;
    nextTask: T;
  }) => {
    const { sessionProcessId, taskId, nextTask } = options;

    return Effect.gen(function* () {
      const { task } = yield* getTask(taskId);

      yield* Ref.update(processesRef, (processes) => {
        return processes.map((p) =>
          p.def.sessionProcessId === sessionProcessId
            ? {
                ...p,
                tasks: p.tasks.map((t) =>
                  t.def.taskId === task.def.taskId ? { ...nextTask } : t,
                ),
              }
            : p,
        );
      });

      const updated = yield* getTask(taskId);
      if (updated === undefined) {
        throw new Error("Unreachable: updatedProcess is undefined");
      }

      return updated.task as T;
    });
  };

  const toNotInitializedState = (options: {
    sessionProcessId: string;
    rawUserMessage: string;
  }) => {
    const { sessionProcessId, rawUserMessage } = options;

    return Effect.gen(function* () {
      const currentProcess = yield* getSessionProcess(sessionProcessId);

      if (currentProcess.type !== "pending") {
        return yield* Effect.fail(
          new IllegalStateChangeError({
            from: currentProcess.type,
            to: "not_initialized",
          }),
        );
      }

      const newTask = yield* changeTaskState({
        sessionProcessId,
        taskId: currentProcess.currentTask.def.taskId,
        nextTask: {
          status: "running",
          def: currentProcess.currentTask.def,
        },
      });

      const newProcess = yield* dangerouslyChangeProcessState({
        sessionProcessId,
        nextState: {
          type: "not_initialized",
          def: currentProcess.def,
          tasks: currentProcess.tasks,
          currentTask: newTask,
          rawUserMessage,
        },
      });

      return {
        sessionProcess: newProcess,
        task: newTask,
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
      if (currentProcess.type !== "not_initialized") {
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
          sessionId: initContext.initMessage.session_id,
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
    resultMessage: SDKResultMessage;
  }) => {
    const { sessionProcessId, resultMessage } = options;

    return Effect.gen(function* () {
      const currentProcess = yield* getSessionProcess(sessionProcessId);
      if (currentProcess.type !== "file_created") {
        return yield* Effect.fail(
          new IllegalStateChangeError({
            from: currentProcess.type,
            to: "paused",
          }),
        );
      }

      const newTask = yield* changeTaskState({
        sessionProcessId,
        taskId: currentProcess.currentTask.def.taskId,
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
            t.def.taskId === newTask.def.taskId ? newTask : t,
          ),
          sessionId: currentProcess.sessionId,
        },
      });

      return {
        sessionProcess: newProcess,
      };
    });
  };

  const toCompletedState = (options: {
    sessionProcessId: string;
    error?: unknown;
  }) => {
    const { sessionProcessId, error } = options;

    return Effect.gen(function* () {
      const currentProcess = yield* getSessionProcess(sessionProcessId);

      const currentTask =
        currentProcess.type === "not_initialized" ||
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
        yield* changeTaskState({
          sessionProcessId,
          taskId: newTask.def.taskId,
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
              ? currentProcess.tasks.map((t) =>
                  t.def.taskId === newTask.def.taskId ? newTask : t,
                )
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
    toNotInitializedState,
    toInitializedState,
    toFileCreatedState,
    toPausedState,
    toCompletedState,
    dangerouslyChangeProcessState,
    getSessionProcesses,
    getSessionProcess,

    // task
    getTask,
    changeTaskState,
  };
});

export type IClaudeCodeSessionProcessService = InferEffect<typeof LayerImpl>;

export class ClaudeCodeSessionProcessService extends Context.Tag(
  "ClaudeCodeSessionProcessService",
)<ClaudeCodeSessionProcessService, IClaudeCodeSessionProcessService>() {
  static Live = Layer.effect(this, LayerImpl);
}
