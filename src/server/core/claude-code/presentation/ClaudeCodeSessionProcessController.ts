import { Context, Effect, Layer } from "effect";
import type { PublicSessionProcess } from "../../../../types/session-process.ts";
import type { ControllerResponse } from "../../../lib/effect/toEffectResponse.ts";
import type { InferEffect } from "../../../lib/effect/types.ts";
import { ProjectRepository } from "../../project/infrastructure/ProjectRepository.ts";
import type { UserMessageInput } from "../functions/createMessageGenerator.ts";
import type * as CCTurn from "../models/ClaudeCodeTurn.ts";
import { ClaudeCodeLifeCycleService } from "../services/ClaudeCodeLifeCycleService.ts";

const LayerImpl = Effect.gen(function* () {
  const projectRepository = yield* ProjectRepository;
  const claudeCodeLifeCycleService = yield* ClaudeCodeLifeCycleService;

  const getSessionProcesses = () =>
    Effect.gen(function* () {
      const publicSessionProcesses = yield* claudeCodeLifeCycleService.getPublicSessionProcesses();

      return {
        response: {
          processes: publicSessionProcesses.map(
            (p): PublicSessionProcess => ({
              id: p.def.sessionProcessId,
              projectId: p.def.projectId,
              sessionId: p.sessionId,
              status: p.type === "paused" ? "paused" : "running",
              queuedMessageCount: p.def.getQueueSize(),
              queuedMessages: p.def.getQueuedMessages().map((m) => ({
                text: m.input.text,
                queuedAt: m.queuedAt,
              })),
            }),
          ),
        },
        status: 200,
      } as const satisfies ControllerResponse;
    });

  const createSessionProcess = (options: {
    projectId: string;
    sessionId: string;
    input: UserMessageInput;
    resume: boolean;
    ccOptions?: CCTurn.CCOptions;
  }) =>
    Effect.gen(function* () {
      const { projectId, sessionId, input, resume, ccOptions } = options;

      const { project } = yield* projectRepository.getProject(projectId);

      if (project.meta.projectPath === null) {
        return {
          response: { error: "Project path not found" },
          status: 400 as const,
        } as const satisfies ControllerResponse;
      }

      const result = yield* claudeCodeLifeCycleService.startSessionProcess({
        projectId,
        cwd: project.meta.projectPath,
        sessionId,
        resume,
        input,
        ccOptions,
      });

      return {
        status: 201 as const,
        response: {
          sessionProcess: {
            id: result.sessionProcess.def.sessionProcessId,
            projectId,
            sessionId: result.sessionId,
          },
        },
      } as const satisfies ControllerResponse;
    });

  const continueSessionProcess = (options: {
    projectId: string;
    input: UserMessageInput;
    baseSessionId: string;
    sessionProcessId: string;
  }) =>
    Effect.gen(function* () {
      const { projectId, input, baseSessionId, sessionProcessId } = options;

      const { project } = yield* projectRepository.getProject(projectId);

      if (project.meta.projectPath === null) {
        return {
          response: { error: "Project path not found" },
          status: 400,
        } as const satisfies ControllerResponse;
      }

      const result = yield* claudeCodeLifeCycleService.continueSessionProcess({
        sessionProcessId,
        input,
        baseSessionId,
      });

      return {
        response: {
          sessionProcess: {
            id: result.sessionProcess.def.sessionProcessId,
            projectId: result.sessionProcess.def.projectId,
            sessionId: baseSessionId,
          },
        },
        status: 200,
      } as const satisfies ControllerResponse;
    });

  const enqueueMessage = (options: {
    projectId: string;
    input: UserMessageInput;
    sessionProcessId: string;
  }) =>
    Effect.gen(function* () {
      const result = yield* claudeCodeLifeCycleService.enqueueMessage({
        sessionProcessId: options.sessionProcessId,
        input: options.input,
      });
      return {
        response: { queueSize: result.queueSize },
        status: 200,
      } as const satisfies ControllerResponse;
    });

  return {
    getSessionProcesses,
    createSessionProcess,
    continueSessionProcess,
    enqueueMessage,
  };
});

export type IClaudeCodeSessionProcessController = InferEffect<typeof LayerImpl>;
export class ClaudeCodeSessionProcessController extends Context.Tag(
  "ClaudeCodeSessionProcessController",
)<ClaudeCodeSessionProcessController, IClaudeCodeSessionProcessController>() {
  static Live = Layer.effect(this, LayerImpl);
}
