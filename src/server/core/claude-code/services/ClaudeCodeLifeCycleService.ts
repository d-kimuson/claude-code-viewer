import type { SDKMessage, SDKUserMessage } from "@anthropic-ai/claude-agent-sdk";
import type { FileSystem, Path } from "@effect/platform";
import type { CommandExecutor } from "@effect/platform/CommandExecutor";
import { Context, Effect, Layer, Runtime } from "effect";
import { ulid } from "ulid";
import type { InferEffect } from "../../../lib/effect/types";
import { EventBus } from "../../events/services/EventBus";
import type { CcvOptionsService } from "../../platform/services/CcvOptionsService";
import type { EnvService } from "../../platform/services/EnvService";
import type { SessionMetaService } from "../../session/services/SessionMetaService";
import { createMessageGenerator, type UserMessageInput } from "../functions/createMessageGenerator";
import * as CCSessionProcess from "../models/CCSessionProcess";
import * as ClaudeCode from "../models/ClaudeCode";
import type * as CCTurn from "../models/ClaudeCodeTurn";
import { CCVAskUserQuestionService } from "./CCVAskUserQuestionService";
import { ClaudeCodePermissionService } from "./ClaudeCodePermissionService";
import { ClaudeCodeSessionProcessService } from "./ClaudeCodeSessionProcessService";

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
    sessionId?: string;
    baseSession:
      | undefined
      | {
          type: "resume";
          sessionId: string;
        };
    ccOptions?: CCTurn.CCOptions;
  }) => {
    const { projectId, cwd, input, sessionId, baseSession, ccOptions } = options;

    return Effect.gen(function* () {
      const {
        generateMessages,
        setNextMessage,
        setHooks: setMessageGeneratorHooks,
      } = createMessageGenerator();

      const turnDef: CCTurn.NewClaudeCodeTurnDef | CCTurn.ResumeClaudeCodeTurnDef =
        baseSession === undefined
          ? {
              type: "new",
              turnId: ulid(),
              sessionId: sessionId ?? ulid(),
              ccOptions,
            }
          : {
              type: "resume",
              turnId: ulid(),
              sessionId: baseSession.sessionId,
              baseSessionId: baseSession.sessionId,
              ccOptions,
            };

      const { sessionProcess, task } = yield* sessionProcessService.startSessionProcess({
        sessionDef: {
          projectId,
          cwd,
          abortController: new AbortController(),
          setNextMessage,
          sessionProcessId: ulid(),
        },
        turnDef,
      });

      setMessageGeneratorHooks({
        onNewUserMessageResolved: (input) => {
          Effect.runFork(
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
            return yield* Effect.die(new Error("Illegal state: paused is not expected"));
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
        .catch((error: unknown) => {
          console.error("Error occur in task daemon process", error);
          throw error;
        })
        .finally(() => {
          Effect.runFork(
            Effect.gen(function* () {
              const currentProcess = yield* sessionProcessService.getSessionProcess(
                sessionProcess.def.sessionProcessId,
              );

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

  const abortTask = (sessionProcessId: string): Effect.Effect<void, Error> =>
    Effect.gen(function* () {
      const currentProcess = yield* sessionProcessService.getSessionProcess(sessionProcessId);

      yield* permissionService.cancelPendingRequests(currentProcess.sessionId);
      yield* ccvAskUserQuestionService.cancelPendingRequests(currentProcess.sessionId);

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
    continueSessionProcess,
    startSessionProcess,
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
