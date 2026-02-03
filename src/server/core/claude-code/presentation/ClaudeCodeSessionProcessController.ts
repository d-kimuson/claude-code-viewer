import { Context, Effect, Layer } from "effect";
import type { PublicSessionProcess } from "../../../../types/session-process";
import type { ControllerResponse } from "../../../lib/effect/toEffectResponse";
import type { InferEffect } from "../../../lib/effect/types";
import { UserConfigService } from "../../platform/services/UserConfigService";
import { ProjectRepository } from "../../project/infrastructure/ProjectRepository";
import type { UserMessageInput } from "../functions/createMessageGenerator";
import type * as CCTurn from "../models/ClaudeCodeTurn";
import { ClaudeCodeLifeCycleService } from "../services/ClaudeCodeLifeCycleService";

const LayerImpl = Effect.gen(function* () {
  const projectRepository = yield* ProjectRepository;
  const claudeCodeLifeCycleService = yield* ClaudeCodeLifeCycleService;
  const userConfigService = yield* UserConfigService;

  const getSessionProcesses = () =>
    Effect.gen(function* () {
      const publicSessionProcesses =
        yield* claudeCodeLifeCycleService.getPublicSessionProcesses();

      return {
        response: {
          processes: publicSessionProcesses.map(
            (p): PublicSessionProcess => ({
              id: p.def.sessionProcessId,
              projectId: p.def.projectId,
              sessionId: p.sessionId,
              status: p.type === "paused" ? "paused" : "running",
            }),
          ),
        },
        status: 200,
      } as const satisfies ControllerResponse;
    });

  const createSessionProcess = (options: {
    projectId: string;
    input: UserMessageInput;
    baseSession:
      | undefined
      | {
          type: "fork";
          sessionId: string;
        }
      | {
          type: "resume";
          sessionId: string;
        };
    ccOptions?: CCTurn.CCOptions;
  }) =>
    Effect.gen(function* () {
      const { projectId, input, baseSession, ccOptions } = options;

      const { project } = yield* projectRepository.getProject(projectId);
      const userConfig = yield* userConfigService.getUserConfig();

      if (project.meta.projectPath === null) {
        return {
          response: { error: "Project path not found" },
          status: 400 as const,
        } as const satisfies ControllerResponse;
      }

      const result = yield* claudeCodeLifeCycleService.startSessionProcess({
        projectId,
        cwd: project.meta.projectPath,
        baseSession,
        userConfig,
        input,
        ccOptions,
      });

      const { sessionId } = yield* result.yieldSessionInitialized();

      return {
        status: 201 as const,
        response: {
          sessionProcess: {
            id: result.sessionProcess.def.sessionProcessId,
            projectId,
            sessionId,
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

  return {
    getSessionProcesses,
    createSessionProcess,
    continueSessionProcess,
  };
});

export type IClaudeCodeSessionProcessController = InferEffect<typeof LayerImpl>;
export class ClaudeCodeSessionProcessController extends Context.Tag(
  "ClaudeCodeSessionProcessController",
)<ClaudeCodeSessionProcessController, IClaudeCodeSessionProcessController>() {
  static Live = Layer.effect(this, LayerImpl);
}
