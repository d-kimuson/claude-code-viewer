import { readdir } from "node:fs/promises";
import { homedir } from "node:os";
import { resolve } from "node:path";
import type { CommandExecutor, FileSystem, Path } from "@effect/platform";
import { zValidator } from "@hono/zod-validator";
import { Effect, Runtime } from "effect";
import { setCookie } from "hono/cookie";
import { streamSSE } from "hono/streaming";
import prexit from "prexit";
import { z } from "zod";
import type { PublicSessionProcess } from "../../types/session-process";
import { computeClaudeProjectFilePath } from "../core/claude-code/functions/computeClaudeProjectFilePath";
import { ClaudeCodeLifeCycleService } from "../core/claude-code/services/ClaudeCodeLifeCycleService";
import { ClaudeCodePermissionService } from "../core/claude-code/services/ClaudeCodePermissionService";
import { getDirectoryListing } from "../core/directory-browser/functions/getDirectoryListing";
import { adaptInternalEventToSSE } from "../core/events/functions/adaptInternalEventToSSE";
import { TypeSafeSSE } from "../core/events/functions/typeSafeSSE";
import { EventBus } from "../core/events/services/EventBus";
import type { InternalEventDeclaration } from "../core/events/types/InternalEventDeclaration";
import { getFileCompletion } from "../core/file-completion/functions/getFileCompletion";
import { getBranches } from "../core/git/functions/getBranches";
import { getCommits } from "../core/git/functions/getCommits";
import { getDiff } from "../core/git/functions/getDiff";
import { getMcpList } from "../core/mcp/functions/getMcpList";
import { encodeProjectId } from "../core/project/functions/id";
import { ProjectRepository } from "../core/project/infrastructure/ProjectRepository";
import type { ProjectMetaService } from "../core/project/services/ProjectMetaService";
import { SessionRepository } from "../core/session/infrastructure/SessionRepository";
import type { VirtualConversationDatabase } from "../core/session/infrastructure/VirtualConversationDatabase";
import type { SessionMetaService } from "../core/session/services/SessionMetaService";
import { configSchema } from "../lib/config/config";
import { claudeCommandsDirPath } from "../lib/config/paths";
import { env } from "../lib/env";
import type { HonoAppType } from "./app";
import { InitializeService } from "./initialize";
import { configMiddleware } from "./middleware/config.middleware";

export const routes = (app: HonoAppType) =>
  Effect.gen(function* () {
    const sessionRepository = yield* SessionRepository;
    const projectRepository = yield* ProjectRepository;
    const claudeCodeLifeCycleService = yield* ClaudeCodeLifeCycleService;
    const claudeCodePermissionService = yield* ClaudeCodePermissionService;
    const initializeService = yield* InitializeService;
    const eventBus = yield* EventBus;

    const runtime = yield* Effect.runtime<
      | ProjectMetaService
      | SessionMetaService
      | VirtualConversationDatabase
      | FileSystem.FileSystem
      | Path.Path
      | CommandExecutor.CommandExecutor
    >();

    if (env.get("NEXT_PHASE") !== "phase-production-build") {
      yield* initializeService.startInitialization();

      prexit(async () => {
        await Runtime.runPromise(runtime)(initializeService.stopCleanup());
      });
    }

    return (
      app
        // middleware
        .use(configMiddleware)
        .use(async (_c, next) => {
          await next();
        })

        // routes
        .get("/config", async (c) => {
          return c.json({
            config: c.get("config"),
          });
        })

        .put("/config", zValidator("json", configSchema), async (c) => {
          const { ...config } = c.req.valid("json");

          setCookie(c, "ccv-config", JSON.stringify(config));

          return c.json({
            config,
          });
        })

        .get("/projects", async (c) => {
          const program = Effect.gen(function* () {
            return yield* projectRepository.getProjects();
          });

          const { projects } = await Runtime.runPromise(runtime)(program);

          return c.json({ projects });
        })

        .post(
          "/projects",
          zValidator(
            "json",
            z.object({
              projectPath: z.string().min(1, "Project path is required"),
            }),
          ),
          async (c) => {
            const { projectPath } = c.req.valid("json");

            // No project validation needed - startTask will create a new project
            // if it doesn't exist when running /init command
            const claudeProjectFilePath =
              computeClaudeProjectFilePath(projectPath);
            const projectId = encodeProjectId(claudeProjectFilePath);

            const program = Effect.gen(function* () {
              const result = yield* claudeCodeLifeCycleService.startTask({
                baseSession: {
                  cwd: projectPath,
                  projectId,
                  sessionId: undefined,
                },
                config: c.get("config"),
                message: "/init",
              });

              return {
                result,
                status: 200 as const,
              };
            });

            const result = await Runtime.runPromise(runtime)(program);

            if (result.status === 200) {
              const { sessionId } =
                await result.result.awaitSessionFileCreated();

              return c.json({
                projectId: result.result.sessionProcess.def.projectId,
                sessionId,
              });
            }

            return c.json({ error: "Failed to create project" }, 500);
          },
        )

        .get(
          "/directory-browser",
          zValidator(
            "query",
            z.object({
              currentPath: z.string().optional(),
            }),
          ),
          async (c) => {
            const { currentPath } = c.req.valid("query");
            const rootPath = "/";
            const defaultPath = homedir();

            try {
              const targetPath = currentPath || defaultPath;
              const relativePath = targetPath.startsWith(rootPath)
                ? targetPath.slice(rootPath.length)
                : targetPath;

              const result = await getDirectoryListing(rootPath, relativePath);
              return c.json(result);
            } catch (error) {
              console.error("Directory listing error:", error);
              if (error instanceof Error) {
                return c.json({ error: error.message }, 400);
              }
              return c.json({ error: "Failed to list directory" }, 500);
            }
          },
        )

        .get(
          "/projects/:projectId",
          zValidator("query", z.object({ cursor: z.string().optional() })),
          async (c) => {
            const { projectId } = c.req.param();
            const { cursor } = c.req.valid("query");
            const config = c.get("config");

            const program = Effect.gen(function* () {
              const { project } =
                yield* projectRepository.getProject(projectId);
              const { sessions } = yield* sessionRepository.getSessions(
                projectId,
                { cursor },
              );

              let filteredSessions = sessions;

              // Filter sessions based on hideNoUserMessageSession setting
              if (config.hideNoUserMessageSession) {
                filteredSessions = filteredSessions.filter((session) => {
                  return session.meta.firstCommand !== null;
                });
              }

              // Unify sessions with same title if unifySameTitleSession is enabled
              if (config.unifySameTitleSession) {
                const sessionMap = new Map<
                  string,
                  (typeof filteredSessions)[0]
                >();

                for (const session of filteredSessions) {
                  // Generate title for comparison
                  const title =
                    session.meta.firstCommand !== null
                      ? (() => {
                          const cmd = session.meta.firstCommand;
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
                    if (
                      session.lastModifiedAt &&
                      existingSession.lastModifiedAt
                    ) {
                      if (
                        session.lastModifiedAt > existingSession.lastModifiedAt
                      ) {
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
                project,
                sessions: filteredSessions,
                nextCursor: hasMore ? sessions.at(-1)?.id : undefined,
              };
            });

            const result = await Runtime.runPromise(runtime)(program);
            return c.json(result);
          },
        )

        .get("/projects/:projectId/latest-session", async (c) => {
          const { projectId } = c.req.param();

          const program = Effect.gen(function* () {
            const { sessions } = yield* sessionRepository.getSessions(
              projectId,
              { maxCount: 1 },
            );

            return {
              latestSession: sessions[0] ?? null,
            };
          });

          const result = await Runtime.runPromise(runtime)(program);
          return c.json(result);
        })

        .get("/projects/:projectId/sessions/:sessionId", async (c) => {
          const { projectId, sessionId } = c.req.param();

          const program = Effect.gen(function* () {
            const { session } = yield* sessionRepository.getSession(
              projectId,
              sessionId,
            );
            return { session };
          });

          const result = await Runtime.runPromise(runtime)(program);
          return c.json(result);
        })

        .get(
          "/projects/:projectId/file-completion",
          zValidator(
            "query",
            z.object({
              basePath: z.string().optional().default("/"),
            }),
          ),
          async (c) => {
            const { projectId } = c.req.param();
            const { basePath } = c.req.valid("query");

            const program = Effect.gen(function* () {
              const { project } =
                yield* projectRepository.getProject(projectId);

              if (project.meta.projectPath === null) {
                return {
                  error: "Project path not found",
                  status: 400 as const,
                };
              }

              const projectPath = project.meta.projectPath;

              try {
                const result = yield* Effect.promise(() =>
                  getFileCompletion(projectPath, basePath),
                );
                return { data: result, status: 200 as const };
              } catch (error) {
                console.error("File completion error:", error);
                return {
                  error: "Failed to get file completion",
                  status: 500 as const,
                };
              }
            });

            const result = await Runtime.runPromise(runtime)(program);

            if (result.status === 200) {
              return c.json(result.data);
            }
            return c.json({ error: result.error }, result.status);
          },
        )

        .get("/projects/:projectId/claude-commands", async (c) => {
          const { projectId } = c.req.param();

          const program = Effect.gen(function* () {
            const { project } = yield* projectRepository.getProject(projectId);

            const [globalCommands, projectCommands] = yield* Effect.promise(
              () =>
                Promise.allSettled([
                  readdir(claudeCommandsDirPath, {
                    withFileTypes: true,
                  }).then((dirents) =>
                    dirents
                      .filter((d) => d.isFile() && d.name.endsWith(".md"))
                      .map((d) => d.name.replace(/\.md$/, "")),
                  ),
                  project.meta.projectPath !== null
                    ? readdir(
                        resolve(
                          project.meta.projectPath,
                          ".claude",
                          "commands",
                        ),
                        {
                          withFileTypes: true,
                        },
                      ).then((dirents) =>
                        dirents
                          .filter((d) => d.isFile() && d.name.endsWith(".md"))
                          .map((d) => d.name.replace(/\.md$/, "")),
                      )
                    : [],
                ]),
            );

            return {
              globalCommands:
                globalCommands.status === "fulfilled"
                  ? globalCommands.value
                  : [],
              projectCommands:
                projectCommands.status === "fulfilled"
                  ? projectCommands.value
                  : [],
              defaultCommands: ["init", "compact"],
            };
          });

          const result = await Runtime.runPromise(runtime)(program);
          return c.json(result);
        })

        .get("/projects/:projectId/git/branches", async (c) => {
          const { projectId } = c.req.param();

          const program = Effect.gen(function* () {
            const { project } = yield* projectRepository.getProject(projectId);

            if (project.meta.projectPath === null) {
              return { error: "Project path not found", status: 400 as const };
            }

            const projectPath = project.meta.projectPath;

            try {
              const result = yield* Effect.promise(() =>
                getBranches(projectPath),
              );
              return { data: result, status: 200 as const };
            } catch (error) {
              console.error("Get branches error:", error);
              if (error instanceof Error) {
                return { error: error.message, status: 400 as const };
              }
              return { error: "Failed to get branches", status: 500 as const };
            }
          });

          const result = await Runtime.runPromise(runtime)(program);
          if (result.status === 200) {
            return c.json(result.data);
          }

          return c.json({ error: result.error }, result.status);
        })

        .get("/projects/:projectId/git/commits", async (c) => {
          const { projectId } = c.req.param();

          const program = Effect.gen(function* () {
            const { project } = yield* projectRepository.getProject(projectId);

            if (project.meta.projectPath === null) {
              return { error: "Project path not found", status: 400 as const };
            }

            const projectPath = project.meta.projectPath;

            try {
              const result = yield* Effect.promise(() =>
                getCommits(projectPath),
              );
              return { data: result, status: 200 as const };
            } catch (error) {
              console.error("Get commits error:", error);
              if (error instanceof Error) {
                return { error: error.message, status: 400 as const };
              }
              return { error: "Failed to get commits", status: 500 as const };
            }
          });

          const result = await Runtime.runPromise(runtime)(program);
          if (result.status === 200) {
            return c.json(result.data);
          }
          return c.json({ error: result.error }, result.status);
        })

        .post(
          "/projects/:projectId/git/diff",
          zValidator(
            "json",
            z.object({
              fromRef: z.string().min(1, "fromRef is required"),
              toRef: z.string().min(1, "toRef is required"),
            }),
          ),
          async (c) => {
            const { projectId } = c.req.param();
            const { fromRef, toRef } = c.req.valid("json");

            const program = Effect.gen(function* () {
              const { project } =
                yield* projectRepository.getProject(projectId);

              try {
                if (project.meta.projectPath === null) {
                  return {
                    error: "Project path not found",
                    status: 400 as const,
                  };
                }

                const projectPath = project.meta.projectPath;

                const result = yield* Effect.promise(() =>
                  getDiff(projectPath, fromRef, toRef),
                );
                return { data: result, status: 200 as const };
              } catch (error) {
                console.error("Get diff error:", error);
                if (error instanceof Error) {
                  return { error: error.message, status: 400 as const };
                }
                return { error: "Failed to get diff", status: 500 as const };
              }
            });

            const result = await Runtime.runPromise(runtime)(program);
            if (result.status === 200) {
              return c.json(result.data);
            }
            return c.json({ error: result.error }, result.status);
          },
        )

        .get("/projects/:projectId/mcp/list", async (c) => {
          const { projectId } = c.req.param();
          const { servers } = await getMcpList(projectId);
          return c.json({ servers });
        })

        .get("/cc/session-processes", async (c) => {
          const publicProcesses = await Runtime.runPromise(runtime)(
            claudeCodeLifeCycleService.getPublicSessionProcesses(),
          );
          return c.json({
            processes: publicProcesses.map(
              (process): PublicSessionProcess => ({
                id: process.def.sessionProcessId,
                projectId: process.def.projectId,
                sessionId: process.sessionId,
                status: process.type === "paused" ? "paused" : "running",
              }),
            ),
          });
        })

        // new or resume
        .post(
          "/cc/session-processes",
          zValidator(
            "json",
            z.object({
              projectId: z.string(),
              message: z.string(),
              baseSessionId: z.string().optional(),
            }),
          ),
          async (c) => {
            const { projectId, message, baseSessionId } = c.req.valid("json");

            const program = Effect.gen(function* () {
              const { project } =
                yield* projectRepository.getProject(projectId);

              if (project.meta.projectPath === null) {
                return {
                  error: "Project path not found",
                  status: 400 as const,
                };
              }

              const result = yield* claudeCodeLifeCycleService.startTask({
                baseSession: {
                  cwd: project.meta.projectPath,
                  projectId,
                  sessionId: baseSessionId,
                },
                config: c.get("config"),
                message,
              });

              return {
                result,
                status: 200 as const,
              };
            });

            const result = await Runtime.runPromise(runtime)(program);

            if (result.status === 200) {
              const { sessionId } =
                await result.result.awaitSessionInitialized();

              return c.json({
                sessionProcess: {
                  id: result.result.sessionProcess.def.sessionProcessId,
                  projectId: result.result.sessionProcess.def.projectId,
                  sessionId,
                },
              });
            }

            return c.json({ error: result.error }, result.status);
          },
        )

        // continue
        .post(
          "/cc/session-processes/:sessionProcessId/continue",
          zValidator(
            "json",
            z.object({
              projectId: z.string(),
              continueMessage: z.string(),
              baseSessionId: z.string(),
            }),
          ),
          async (c) => {
            const { sessionProcessId } = c.req.param();
            const { projectId, continueMessage, baseSessionId } =
              c.req.valid("json");

            const program = Effect.gen(function* () {
              const { project } =
                yield* projectRepository.getProject(projectId);

              if (project.meta.projectPath === null) {
                return {
                  error: "Project path not found",
                  status: 400 as const,
                };
              }

              const result = yield* claudeCodeLifeCycleService.continueTask({
                sessionProcessId,
                message: continueMessage,
                baseSessionId,
              });

              return {
                data: {
                  sessionProcess: {
                    id: result.sessionProcess.def.sessionProcessId,
                    projectId: result.sessionProcess.def.projectId,
                    sessionId: baseSessionId,
                  },
                },
                status: 200 as const,
              };
            });

            const result = await Runtime.runPromise(runtime)(program);
            if (result.status === 200) {
              return c.json(result.data);
            }

            return c.json({ error: result.error }, result.status);
          },
        )

        .post(
          "/cc/session-processes/:sessionProcessId/abort",
          zValidator("json", z.object({ projectId: z.string() })),
          async (c) => {
            const { sessionProcessId } = c.req.param();
            void Effect.runFork(
              claudeCodeLifeCycleService.abortTask(sessionProcessId),
            );
            return c.json({ message: "Task aborted" });
          },
        )

        .post(
          "/cc/permission-response",
          zValidator(
            "json",
            z.object({
              permissionRequestId: z.string(),
              decision: z.enum(["allow", "deny"]),
            }),
          ),
          async (c) => {
            const permissionResponse = c.req.valid("json");
            Effect.runFork(
              claudeCodePermissionService.respondToPermissionRequest(
                permissionResponse,
              ),
            );
            return c.json({ message: "Permission response received" });
          },
        )

        .get("/sse", async (c) => {
          return streamSSE(
            c,
            async (rawStream) => {
              const handleSSE = Effect.gen(function* () {
                const typeSafeSSE = yield* TypeSafeSSE;

                // Send connect event
                yield* typeSafeSSE.writeSSE("connect", {
                  timestamp: new Date().toISOString(),
                });

                const onHeartbeat = () => {
                  Effect.runFork(
                    typeSafeSSE.writeSSE("heartbeat", {
                      timestamp: new Date().toISOString(),
                    }),
                  );
                };

                const onSessionListChanged = (
                  event: InternalEventDeclaration["sessionListChanged"],
                ) => {
                  Effect.runFork(
                    typeSafeSSE.writeSSE("sessionListChanged", {
                      projectId: event.projectId,
                    }),
                  );
                };

                const onSessionChanged = (
                  event: InternalEventDeclaration["sessionChanged"],
                ) => {
                  Effect.runFork(
                    typeSafeSSE.writeSSE("sessionChanged", {
                      projectId: event.projectId,
                      sessionId: event.sessionId,
                    }),
                  );
                };

                const onSessionProcessChanged = (
                  event: InternalEventDeclaration["sessionProcessChanged"],
                ) => {
                  Effect.runFork(
                    typeSafeSSE.writeSSE("sessionProcessChanged", {
                      processes: event.processes,
                    }),
                  );
                };

                const onPermissionRequested = (
                  event: InternalEventDeclaration["permissionRequested"],
                ) => {
                  Effect.runFork(
                    typeSafeSSE.writeSSE("permissionRequested", {
                      permissionRequest: event.permissionRequest,
                    }),
                  );
                };

                yield* eventBus.on("sessionListChanged", onSessionListChanged);
                yield* eventBus.on("sessionChanged", onSessionChanged);
                yield* eventBus.on(
                  "sessionProcessChanged",
                  onSessionProcessChanged,
                );
                yield* eventBus.on("heartbeat", onHeartbeat);
                yield* eventBus.on(
                  "permissionRequested",
                  onPermissionRequested,
                );

                const { connectionPromise } = adaptInternalEventToSSE(
                  rawStream,
                  {
                    timeout: 5 /* min */ * 60 /* sec */ * 1000,
                    cleanUp: async () => {
                      await Effect.runPromise(
                        Effect.gen(function* () {
                          yield* eventBus.off(
                            "sessionListChanged",
                            onSessionListChanged,
                          );
                          yield* eventBus.off(
                            "sessionChanged",
                            onSessionChanged,
                          );
                          yield* eventBus.off(
                            "sessionProcessChanged",
                            onSessionProcessChanged,
                          );
                          yield* eventBus.off("heartbeat", onHeartbeat);
                          yield* eventBus.off(
                            "permissionRequested",
                            onPermissionRequested,
                          );
                        }),
                      );
                    },
                  },
                );

                return {
                  connectionPromise,
                };
              });

              const { connectionPromise } = await Runtime.runPromise(runtime)(
                handleSSE.pipe(Effect.provide(TypeSafeSSE.make(rawStream))),
              );

              await connectionPromise;
            },
            async (err) => {
              console.error("Streaming error:", err);
            },
          );
        })
    );
  });

export type RouteType = ReturnType<typeof routes> extends Effect.Effect<
  infer A,
  unknown,
  unknown
>
  ? A
  : never;
