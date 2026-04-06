import type { SDKMessage, SDKUserMessage } from "@anthropic-ai/claude-agent-sdk";
import type { FileSystem, Path } from "@effect/platform";
import type { CommandExecutor } from "@effect/platform/CommandExecutor";
import { Context, Effect, Layer, Runtime } from "effect";
import { ulid } from "ulid";
import type { InferEffect } from "../../../lib/effect/types.ts";
import { EventBus } from "../../events/services/EventBus.ts";
import type { CcvOptionsService } from "../../platform/services/CcvOptionsService.ts";
import type { EnvService } from "../../platform/services/EnvService.ts";
import type { SessionMetaService } from "../../session/services/SessionMetaService.ts";
import {
  createMessageGenerator,
  type UserMessageInput,
} from "../functions/createMessageGenerator.ts";
import * as CCSessionProcess from "../models/CCSessionProcess.ts";
import * as ClaudeCode from "../models/ClaudeCode.ts";
import type * as CCTurn from "../models/ClaudeCodeTurn.ts";
import { CCVAskUserQuestionService } from "./CCVAskUserQuestionService.ts";
import { ClaudeCodePermissionService } from "./ClaudeCodePermissionService.ts";
import { ClaudeCodeSessionProcessService } from "./ClaudeCodeSessionProcessService.ts";

export type MessageGenerator = () => AsyncGenerator<SDKUserMessage, void, unknown>;

const LayerImpl = Effect.gen(function* () {
  const eventBusService = yield* EventBus;
  const sessionProcessService = yield* ClaudeCodeSessionProcessService;
  const permissionService = yield* ClaudeCodePermissionService;
  const ccvAskUserQuestionService = yield* CCVAskUserQuestionService;

  const runtime = yield* Effect.runtime<
    | FileSystem.FileSystem
    | Path.Path
    | CommandExecutor
    | SessionMetaService
    | ClaudeCodePermissionService
    | EnvService
    | CcvOptionsService
  >();

  const continueSessionProcess = (options: {
    sessionProcessId: string;
    baseSessionId: string;
    input: UserMessageInput;
  }) => {
    const { sessionProcessId, baseSessionId, input } = options;

    return Effect.gen(function* () {
      const { sessionProcess, task } = yield* sessionProcessService.continueSessionProcess({
        sessionProcessId,
        turnDef: {
          type: "continue",
          sessionId: baseSessionId,
          baseSessionId: baseSessionId,
          turnId: ulid(),
        },
      });

      sessionProcess.def.setNextMessage(input);
      return {
        sessionProcess,
        task,
      };
    });
  };

  const startSessionProcess = (options: {
    projectId: string;
    cwd: string;
    input: UserMessageInput;
    sessionId: string;
    resume: boolean;
    ccOptions?: CCTurn.CCOptions;
  }) => {
    const { projectId, cwd, input, sessionId, resume, ccOptions } = options;

    return Effect.gen(function* () {
      const {
        generateMessages,
        setNextMessage,
        getQueuedMessages,
        getQueueSize,
        setHooks: setMessageGeneratorHooks,
      } = createMessageGenerator();

      const turnDef: CCTurn.NewClaudeCodeTurnDef | CCTurn.ResumeClaudeCodeTurnDef = !resume
        ? {
            type: "new",
            turnId: ulid(),
            sessionId,
            ccOptions,
          }
        : {
            type: "resume",
            turnId: ulid(),
            sessionId,
            baseSessionId: sessionId,
            ccOptions,
          };

      const { sessionProcess, task } = yield* sessionProcessService.startSessionProcess({
        sessionDef: {
          projectId,
          cwd,
          abortController: new AbortController(),
          setNextMessage,
          getQueuedMessages,
          getQueueSize,
          sessionProcessId: ulid(),
        },
        turnDef,
      });

      setMessageGeneratorHooks({
        onNewUserMessageResolved: async (input) => {
          const processState = await Effect.runPromise(
            sessionProcessService.getSessionProcess(sessionProcess.def.sessionProcessId),
          );

          if (processState.type === "paused") {
            // Auto-continue: create a new turn for queued message
            await Effect.runPromise(
              sessionProcessService.continueSessionProcess({
                sessionProcessId: sessionProcess.def.sessionProcessId,
                turnDef: {
                  type: "continue",
                  sessionId: processState.sessionId,
                  baseSessionId: processState.sessionId,
                  turnId: ulid(),
                },
              }),
            );
          }

          await Effect.runPromise(
            sessionProcessService.updateRawUserMessage({
              sessionProcessId: sessionProcess.def.sessionProcessId,
              rawUserMessage: input.text,
            }),
          );
        },
      });

      const handleMessage = (message: SDKMessage) =>
        Effect.gen(function* () {
          const processState = yield* sessionProcessService.getSessionProcess(
            sessionProcess.def.sessionProcessId,
          );

          // Check abort signal before processing message
          if (sessionProcess.def.abortController.signal.aborted) {
            return "break" as const;
          }

          if (processState.type === "completed") {
            return "break" as const;
          }

          if (processState.type === "paused") {
            yield* Effect.logWarning(
              `[handleMessage] Received message while paused for ${sessionProcess.def.sessionProcessId}. This may indicate a race condition.`,
            );
            return "continue" as const;
          }

          if (
            message.type === "system" &&
            message.subtype === "init" &&
            processState.type === "starting"
          ) {
            yield* sessionProcessService.toInitializedState({
              sessionProcessId: processState.def.sessionProcessId,
              initContext: {
                initMessage: message,
              },
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

          if (message.type === "assistant" && processState.type === "initialized") {
            yield* sessionProcessService.toFileCreatedState({
              sessionProcessId: processState.def.sessionProcessId,
            });
          }

          if (message.type === "result") {
            if (processState.type === "file_created" || processState.type === "initialized") {
              yield* sessionProcessService.toPausedState({
                sessionProcessId: processState.def.sessionProcessId,
                resultMessage: message,
              });

              yield* eventBusService.emit("sessionChanged", {
                projectId: processState.def.projectId,
                sessionId: message.session_id,
              });
            }

            return "continue" as const;
          }

          return "continue" as const;
        });

      const handleSessionProcessDaemon = async () => {
        await Runtime.runPromise(runtime)(
          Effect.logInfo(
            `[SessionProcessDaemon] Starting daemon for ${sessionProcess.def.sessionProcessId} (${task.def.type})`,
          ),
        );
        const messageIter = await Runtime.runPromise(runtime)(
          Effect.gen(function* () {
            const permissionOptions = yield* permissionService.createCanUseToolRelatedOptions({
              turnId: task.def.turnId,
              projectId: sessionProcess.def.projectId,
              permissionMode:
                task.def.type !== "continue" ? task.def.ccOptions?.permissionMode : undefined,
              sessionId: task.def.type === "new" ? task.def.sessionId : task.def.baseSessionId,
            });

            const ccvMcpServer = ccvAskUserQuestionService.createMcpServer({
              turnId: task.def.turnId,
              projectId: sessionProcess.def.projectId,
              sessionId: task.def.type === "new" ? task.def.sessionId : task.def.baseSessionId,
            });

            const baseOptions = {
              ...(task.def.type === "continue" ? {} : task.def.ccOptions),
              ...permissionOptions,
              cwd: sessionProcess.def.cwd,
              abortController: sessionProcess.def.abortController,
              mcpServers: {
                ccv: ccvMcpServer,
              },
            };

            const sdkOptions: Parameters<typeof ClaudeCode.query>[1] =
              task.def.type === "new"
                ? { ...baseOptions, sessionId: task.def.sessionId }
                : {
                    ...baseOptions,
                    resume: task.def.baseSessionId,
                  };

            return yield* ClaudeCode.query(generateMessages(), sdkOptions);
          }),
        );

        setNextMessage(input);

        try {
          for await (const message of messageIter) {
            const result = await Runtime.runPromise(runtime)(handleMessage(message)).catch(
              (error: unknown) => {
                // iter 自体が落ちてなければ継続したいので握りつぶす
                Effect.runFork(
                  sessionProcessService.changeTurnState({
                    sessionProcessId: sessionProcess.def.sessionProcessId,
                    turnId: task.def.turnId,
                    nextTask: {
                      status: "failed",
                      def: task.def,
                      error,
                    },
                  }),
                );

                return "continue" as const;
              },
            );

            if (result === "break") {
              break;
            } else {
            }
          }
        } catch (error) {
          await Effect.runPromise(
            sessionProcessService.changeTurnState({
              sessionProcessId: sessionProcess.def.sessionProcessId,
              turnId: task.def.turnId,
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
        .catch(async (error: unknown) => {
          await Runtime.runPromise(runtime)(
            Effect.logError(`Error occur in task daemon process: ${String(error)}`),
          );
          throw error;
        })
        .finally(() => {
          Effect.runFork(
            Effect.gen(function* () {
              const currentProcess = yield* sessionProcessService.getSessionProcess(
                sessionProcess.def.sessionProcessId,
              );

              // Skip if already completed (e.g., by abortTask) to avoid
              // overwriting abortedByUser flag
              if (currentProcess.type === "completed") {
                return;
              }

              yield* sessionProcessService.toCompletedState({
                sessionProcessId: currentProcess.def.sessionProcessId,
              });
            }),
          );
        });

      // Return immediately with the known sessionId
      return {
        sessionProcess,
        task,
        daemonPromise,
        sessionId: turnDef.sessionId,
      };
    });
  };

  const getPublicSessionProcesses = () =>
    Effect.gen(function* () {
      const processes = yield* sessionProcessService.getSessionProcesses();
      return processes.filter((process) => CCSessionProcess.isPublic(process));
    });

  const enqueueMessage = (options: { sessionProcessId: string; input: UserMessageInput }) => {
    return Effect.gen(function* () {
      const process = yield* sessionProcessService.getSessionProcess(options.sessionProcessId);
      if (process.type === "completed") {
        return yield* Effect.fail(new Error("Cannot enqueue to completed process"));
      }
      process.def.setNextMessage(options.input);
      return { queueSize: process.def.getQueueSize() };
    });
  };

  const abortTask = (sessionProcessId: string): Effect.Effect<void, Error> =>
    Effect.gen(function* () {
      const currentProcess = yield* sessionProcessService.getSessionProcess(sessionProcessId);

      yield* permissionService.cancelPendingRequests(currentProcess.sessionId);
      yield* ccvAskUserQuestionService.cancelPendingRequests(currentProcess.sessionId);

      currentProcess.def.abortController.abort();

      yield* sessionProcessService.toCompletedState({
        sessionProcessId: currentProcess.def.sessionProcessId,
        error: new Error("Task aborted"),
        abortedByUser: true,
      });
    });

  const abortAllTasks = () =>
    Effect.gen(function* () {
      const processes = yield* sessionProcessService.getSessionProcesses();

      for (const process of processes) {
        yield* permissionService.cancelPendingRequests(process.sessionId);
        yield* ccvAskUserQuestionService.cancelPendingRequests(process.sessionId);
        process.def.abortController.abort();

        yield* sessionProcessService.toCompletedState({
          sessionProcessId: process.def.sessionProcessId,
          error: new Error("Task aborted"),
          abortedByUser: true,
        });
      }
    });

  return {
    continueSessionProcess,
    startSessionProcess,
    enqueueMessage,
    abortTask,
    abortAllTasks,
    getPublicSessionProcesses,
  };
});

export type IClaudeCodeLifeCycleService = InferEffect<typeof LayerImpl>;

export class ClaudeCodeLifeCycleService extends Context.Tag("ClaudeCodeLifeCycleService")<
  ClaudeCodeLifeCycleService,
  IClaudeCodeLifeCycleService
>() {
  static Live = Layer.effect(this, LayerImpl);
}
