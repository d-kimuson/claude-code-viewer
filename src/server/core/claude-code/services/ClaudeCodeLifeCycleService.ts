import type {
  SDKMessage,
  SDKUserMessage,
} from "@anthropic-ai/claude-agent-sdk";
import type { FileSystem, Path } from "@effect/platform";
import type { CommandExecutor } from "@effect/platform/CommandExecutor";
import { Context, Effect, Layer, Runtime } from "effect";
import { ulid } from "ulid";
import { controllablePromise } from "../../../../lib/controllablePromise";
import type { UserConfig } from "../../../lib/config/config";
import type { InferEffect } from "../../../lib/effect/types";
import { EventBus } from "../../events/services/EventBus";
import type { EnvService } from "../../platform/services/EnvService";
import { SessionRepository } from "../../session/infrastructure/SessionRepository";
import { VirtualConversationDatabase } from "../../session/infrastructure/VirtualConversationDatabase";
import type { SessionMetaService } from "../../session/services/SessionMetaService";
import {
  createMessageGenerator,
  type UserMessageInput,
} from "../functions/createMessageGenerator";
import { fallbackSdkMessage } from "../functions/fallbackSdkMessage";
import * as CCSessionProcess from "../models/CCSessionProcess";
import * as ClaudeCode from "../models/ClaudeCode";
import { ClaudeCodePermissionService } from "./ClaudeCodePermissionService";
import { ClaudeCodeSessionProcessService } from "./ClaudeCodeSessionProcessService";

export type MessageGenerator = () => AsyncGenerator<
  SDKUserMessage,
  void,
  unknown
>;

const LayerImpl = Effect.gen(function* () {
  const eventBusService = yield* EventBus;
  const sessionRepository = yield* SessionRepository;
  const sessionProcessService = yield* ClaudeCodeSessionProcessService;
  const virtualConversationDatabase = yield* VirtualConversationDatabase;
  const permissionService = yield* ClaudeCodePermissionService;

  const runtime = yield* Effect.runtime<
    | FileSystem.FileSystem
    | Path.Path
    | CommandExecutor
    | VirtualConversationDatabase
    | SessionMetaService
    | ClaudeCodePermissionService
    | EnvService
  >();

  const continueTask = (options: {
    sessionProcessId: string;
    baseSessionId: string;
    input: UserMessageInput;
  }) => {
    const { sessionProcessId, baseSessionId, input } = options;

    return Effect.gen(function* () {
      const { sessionProcess, task } =
        yield* sessionProcessService.continueSessionProcess({
          sessionProcessId,
          taskDef: {
            type: "continue",
            sessionId: baseSessionId,
            baseSessionId: baseSessionId,
            taskId: ulid(),
          },
        });

      const virtualConversation =
        yield* CCSessionProcess.createVirtualConversation(sessionProcess, {
          sessionId: baseSessionId,
          userMessage: input.text,
        });

      yield* virtualConversationDatabase.createVirtualConversation(
        sessionProcess.def.projectId,
        baseSessionId,
        [virtualConversation],
      );

      sessionProcess.def.setNextMessage(input);
      return {
        sessionProcess,
        task,
      };
    });
  };

  const startTask = (options: {
    userConfig: UserConfig;
    baseSession: {
      cwd: string;
      projectId: string;
      sessionId?: string;
    };
    input: UserMessageInput;
  }) => {
    const { baseSession, input, userConfig } = options;

    return Effect.gen(function* () {
      const {
        generateMessages,
        setNextMessage,
        setHooks: setMessageGeneratorHooks,
      } = createMessageGenerator();

      const { sessionProcess, task } =
        yield* sessionProcessService.startSessionProcess({
          sessionDef: {
            projectId: baseSession.projectId,
            cwd: baseSession.cwd,
            abortController: new AbortController(),
            setNextMessage,
            sessionProcessId: ulid(),
          },
          taskDef:
            baseSession.sessionId === undefined
              ? {
                  type: "new",
                  taskId: ulid(),
                }
              : {
                  type: "resume",
                  taskId: ulid(),
                  sessionId: undefined,
                  baseSessionId: baseSession.sessionId,
                },
        });

      const sessionInitializedPromise = controllablePromise<{
        sessionId: string;
      }>();
      const sessionFileCreatedPromise = controllablePromise<{
        sessionId: string;
      }>();

      setMessageGeneratorHooks({
        onNewUserMessageResolved: async (input) => {
          Effect.runFork(
            sessionProcessService.toNotInitializedState({
              sessionProcessId: sessionProcess.def.sessionProcessId,
              rawUserMessage: input.text,
            }),
          );
        },
      });

      const handleMessage = (message: SDKMessage) =>
        Effect.gen(function* () {
          console.log("[debug] handleMessage", message.type);

          const processState = yield* sessionProcessService.getSessionProcess(
            sessionProcess.def.sessionProcessId,
          );

          if (processState.type === "completed") {
            return "break" as const;
          }

          if (processState.type === "paused") {
            // rule: paused は not_initialized に更新されてからくる想定
            yield* Effect.die(
              new Error("Illegal state: paused is not expected"),
            );
          }

          if (
            message.type === "system" &&
            message.subtype === "init" &&
            processState.type === "not_initialized"
          ) {
            yield* sessionProcessService.toInitializedState({
              sessionProcessId: processState.def.sessionProcessId,
              initContext: {
                initMessage: message,
              },
            });

            // Virtual Conversation Creation
            const virtualConversation =
              yield* CCSessionProcess.createVirtualConversation(processState, {
                sessionId: message.session_id,
                userMessage: processState.rawUserMessage,
              });

            if (processState.currentTask.def.type === "new") {
              // 末尾に追加するだけで OK
              yield* virtualConversationDatabase.createVirtualConversation(
                baseSession.projectId,
                message.session_id,
                [virtualConversation],
              );
            } else if (processState.currentTask.def.type === "resume") {
              const existingSession = yield* sessionRepository.getSession(
                processState.def.projectId,
                processState.currentTask.def.baseSessionId,
              );

              const copiedConversations =
                existingSession.session === null
                  ? []
                  : existingSession.session.conversations;

              yield* virtualConversationDatabase.createVirtualConversation(
                processState.def.projectId,
                message.session_id,
                [...copiedConversations, virtualConversation],
              );
            } else {
              // do nothing
            }

            sessionInitializedPromise.resolve({
              sessionId: message.session_id,
            });

            yield* eventBusService.emit("sessionListChanged", {
              projectId: processState.def.projectId,
            });

            yield* eventBusService.emit("sessionChanged", {
              projectId: processState.def.projectId,
              sessionId: message.session_id,
            });

            return "continue" as const;
          }

          if (
            message.type === "assistant" &&
            processState.type === "initialized"
          ) {
            yield* sessionProcessService.toFileCreatedState({
              sessionProcessId: processState.def.sessionProcessId,
            });

            sessionFileCreatedPromise.resolve({
              sessionId: message.session_id,
            });

            yield* virtualConversationDatabase.deleteVirtualConversations(
              message.session_id,
            );
          }

          if (
            message.type === "result" &&
            processState.type === "file_created"
          ) {
            yield* sessionProcessService.toPausedState({
              sessionProcessId: processState.def.sessionProcessId,
              resultMessage: message,
            });

            yield* eventBusService.emit("sessionChanged", {
              projectId: processState.def.projectId,
              sessionId: message.session_id,
            });

            return "continue" as const;
          }

          return "continue" as const;
        });

      const handleSessionProcessDaemon = async () => {
        const messageIter = await Runtime.runPromise(runtime)(
          Effect.gen(function* () {
            const permissionOptions =
              yield* permissionService.createCanUseToolRelatedOptions({
                taskId: task.def.taskId,
                userConfig,
                sessionId: task.def.baseSessionId,
              });

            return yield* ClaudeCode.query(generateMessages(), {
              resume: task.def.baseSessionId,
              cwd: sessionProcess.def.cwd,
              abortController: sessionProcess.def.abortController,
              ...permissionOptions,
            });
          }),
        );

        setNextMessage(input);

        try {
          for await (const message of messageIter) {
            const fallbackMessage = fallbackSdkMessage(message);

            if (fallbackMessage === null) {
              continue;
            }

            const result = await Runtime.runPromise(runtime)(
              handleMessage(fallbackMessage),
            ).catch((error) => {
              // iter 自体が落ちてなければ継続したいので握りつぶす
              Effect.runFork(
                sessionProcessService.changeTaskState({
                  sessionProcessId: sessionProcess.def.sessionProcessId,
                  taskId: task.def.taskId,
                  nextTask: {
                    status: "failed",
                    def: task.def,
                    error: error,
                  },
                }),
              );

              if (sessionInitializedPromise.status === "pending") {
                sessionInitializedPromise.reject(error);
              }

              if (sessionFileCreatedPromise.status === "pending") {
                sessionFileCreatedPromise.reject(error);
              }

              return "continue" as const;
            });

            if (result === "break") {
              break;
            } else {
            }
          }
        } catch (error) {
          if (sessionInitializedPromise.status === "pending") {
            sessionInitializedPromise.reject(error);
          }

          if (sessionFileCreatedPromise.status === "pending") {
            sessionFileCreatedPromise.reject(error);
          }

          await Effect.runPromise(
            sessionProcessService.changeTaskState({
              sessionProcessId: sessionProcess.def.sessionProcessId,
              taskId: task.def.taskId,
              nextTask: {
                status: "failed",
                def: task.def,
                error: error,
              },
            }),
          );
        }
      };

      const daemonPromise = handleSessionProcessDaemon()
        .catch((error) => {
          console.error("Error occur in task daemon process", error);
          if (sessionInitializedPromise.status === "pending") {
            sessionInitializedPromise.reject(error);
          }
          if (sessionFileCreatedPromise.status === "pending") {
            sessionFileCreatedPromise.reject(error);
          }
          throw error;
        })
        .finally(() => {
          Effect.runFork(
            Effect.gen(function* () {
              const currentProcess =
                yield* sessionProcessService.getSessionProcess(
                  sessionProcess.def.sessionProcessId,
                );

              yield* sessionProcessService.toCompletedState({
                sessionProcessId: currentProcess.def.sessionProcessId,
              });
            }),
          );
        });

      return {
        sessionProcess,
        task,
        daemonPromise,
        awaitSessionInitialized: async () =>
          await sessionInitializedPromise.promise,
        awaitSessionFileCreated: async () =>
          await sessionFileCreatedPromise.promise,
        yieldSessionInitialized: () =>
          Effect.promise(() => sessionInitializedPromise.promise),
        yieldSessionFileCreated: () =>
          Effect.promise(() => sessionFileCreatedPromise.promise),
      };
    });
  };

  const getPublicSessionProcesses = () =>
    Effect.gen(function* () {
      const processes = yield* sessionProcessService.getSessionProcesses();
      return processes.filter((process) => CCSessionProcess.isPublic(process));
    });

  const abortTask = (sessionProcessId: string): Effect.Effect<void, Error> =>
    Effect.gen(function* () {
      const currentProcess =
        yield* sessionProcessService.getSessionProcess(sessionProcessId);

      currentProcess.def.abortController.abort();

      yield* sessionProcessService.toCompletedState({
        sessionProcessId: currentProcess.def.sessionProcessId,
        error: new Error("Task aborted"),
      });
    });

  const abortAllTasks = () =>
    Effect.gen(function* () {
      const processes = yield* sessionProcessService.getSessionProcesses();

      for (const process of processes) {
        yield* sessionProcessService.toCompletedState({
          sessionProcessId: process.def.sessionProcessId,
          error: new Error("Task aborted"),
        });
      }
    });

  return {
    continueTask,
    startTask,
    abortTask,
    abortAllTasks,
    getPublicSessionProcesses,
  };
});

export type IClaudeCodeLifeCycleService = InferEffect<typeof LayerImpl>;

export class ClaudeCodeLifeCycleService extends Context.Tag(
  "ClaudeCodeLifeCycleService",
)<ClaudeCodeLifeCycleService, IClaudeCodeLifeCycleService>() {
  static Live = Layer.effect(this, LayerImpl);
}
