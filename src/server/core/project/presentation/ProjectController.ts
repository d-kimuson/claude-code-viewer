import { Context, Effect, Layer } from "effect";
import type { ControllerResponse } from "../../../lib/effect/toEffectResponse";
import type { InferEffect } from "../../../lib/effect/types";
import { computeClaudeProjectFilePath } from "../../claude-code/functions/computeClaudeProjectFilePath";
import { ClaudeCodeLifeCycleService } from "../../claude-code/services/ClaudeCodeLifeCycleService";
import { ApplicationContext } from "../../platform/services/ApplicationContext";
import { UserConfigService } from "../../platform/services/UserConfigService";
import { SessionRepository } from "../../session/infrastructure/SessionRepository";
import { encodeProjectId } from "../functions/id";
import { ProjectRepository } from "../infrastructure/ProjectRepository";

const LayerImpl = Effect.gen(function* () {
  const projectRepository = yield* ProjectRepository;
  const claudeCodeLifeCycleService = yield* ClaudeCodeLifeCycleService;
  const userConfigService = yield* UserConfigService;
  const sessionRepository = yield* SessionRepository;
  const context = yield* ApplicationContext;

  const getProjects = () =>
    Effect.gen(function* () {
      const { projects } = yield* projectRepository.getProjects();
      return {
        status: 200,
        response: { projects },
      } as const satisfies ControllerResponse;
    });

  const getProject = (options: { projectId: string; cursor?: string }) =>
    Effect.gen(function* () {
      const { projectId, cursor } = options;

      const userConfig = yield* userConfigService.getUserConfig();

      const { project } = yield* projectRepository.getProject(projectId);
      const { sessions } = yield* sessionRepository.getSessions(projectId, {
        cursor,
      });

      let filteredSessions = sessions;

      // Filter sessions based on hideNoUserMessageSession setting
      if (userConfig.hideNoUserMessageSession) {
        filteredSessions = filteredSessions.filter((session) => {
          return session.meta.firstUserMessage !== null;
        });
      }

      // Unify sessions with same title if unifySameTitleSession is enabled
      if (userConfig.unifySameTitleSession) {
        const sessionMap = new Map<string, (typeof filteredSessions)[0]>();

        for (const session of filteredSessions) {
          // Generate title for comparison
          const title =
            session.meta.firstUserMessage !== null
              ? (() => {
                  const cmd = session.meta.firstUserMessage;
                  switch (cmd.kind) {
                    case "command":
                      return cmd.commandArgs === undefined
                        ? cmd.commandName
                        : `${cmd.commandName} ${cmd.commandArgs}`;
                    case "local-command":
                      return cmd.stdout;
                    case "text":
                      return cmd.content;
                    default:
                      return session.id;
                  }
                })()
              : session.id;

          const existingSession = sessionMap.get(title);
          if (existingSession) {
            // Keep the session with the latest modification date
            if (session.lastModifiedAt && existingSession.lastModifiedAt) {
              if (session.lastModifiedAt > existingSession.lastModifiedAt) {
                sessionMap.set(title, session);
              }
            } else if (
              session.lastModifiedAt &&
              !existingSession.lastModifiedAt
            ) {
              sessionMap.set(title, session);
            }
            // If no modification dates, keep the existing one
          } else {
            sessionMap.set(title, session);
          }
        }

        filteredSessions = Array.from(sessionMap.values());
      }

      const hasMore = sessions.length >= 20;
      return {
        status: 200,
        response: {
          project,
          sessions: filteredSessions,
          nextCursor: hasMore ? sessions.at(-1)?.id : undefined,
        },
      } as const satisfies ControllerResponse;
    });

  const getProjectLatestSession = (options: { projectId: string }) =>
    Effect.gen(function* () {
      const { projectId } = options;
      const { sessions } = yield* sessionRepository.getSessions(projectId, {
        maxCount: 1,
      });

      return {
        status: 200,
        response: {
          latestSession: sessions[0] ?? null,
        },
      } as const satisfies ControllerResponse;
    });

  const createProject = (options: { projectPath: string }) =>
    Effect.gen(function* () {
      const { projectPath } = options;

      // No project validation needed - startTask will create a new project
      // if it doesn't exist when running /init command
      const claudeProjectFilePath = yield* computeClaudeProjectFilePath({
        projectPath,
        claudeProjectsDirPath: context.claudeCodePaths.claudeProjectsDirPath,
      });
      const projectId = encodeProjectId(claudeProjectFilePath);
      const userConfig = yield* userConfigService.getUserConfig();

      const result = yield* claudeCodeLifeCycleService.startTask({
        baseSession: {
          cwd: projectPath,
          projectId,
          sessionId: undefined,
        },
        userConfig,
        message: "/init",
      });

      const { sessionId } = yield* result.yieldSessionFileCreated();

      return {
        status: 201,
        response: {
          projectId,
          sessionId,
        },
      } as const satisfies ControllerResponse;
    });

  return {
    getProjects,
    getProject,
    getProjectLatestSession,
    createProject,
  };
});

export type IProjectController = InferEffect<typeof LayerImpl>;
export class ProjectController extends Context.Tag("ProjectController")<
  ProjectController,
  IProjectController
>() {
  static Live = Layer.effect(this, LayerImpl);
}
