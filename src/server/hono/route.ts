import { readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { zValidator } from "@hono/zod-validator";
import { setCookie } from "hono/cookie";
import { streamSSE } from "hono/streaming";
import { z } from "zod";
import { type Config, configSchema } from "../config/config";
import { env } from "../lib/env";
import { ClaudeCodeTaskController } from "../service/claude-code/ClaudeCodeTaskController";
import type { SerializableAliveTask } from "../service/claude-code/types";
import { adaptInternalEventToSSE } from "../service/events/adaptInternalEventToSSE";
import { eventBus } from "../service/events/EventBus";
import type { InternalEventDeclaration } from "../service/events/InternalEventDeclaration";
import { writeTypeSafeSSE } from "../service/events/typeSafeSSE";
import { getFileCompletion } from "../service/file-completion/getFileCompletion";
import { getBranches } from "../service/git/getBranches";
import { getCommits } from "../service/git/getCommits";
import { getDiff } from "../service/git/getDiff";
import { getMcpList } from "../service/mcp/getMcpList";
import { claudeCommandsDirPath } from "../service/paths";
import { ProjectRepository } from "../service/project/ProjectRepository";
import { SessionRepository } from "../service/session/SessionRepository";
import type { HonoAppType } from "./app";
import { initialize } from "./initialize";
import { configMiddleware } from "./middleware/config.middleware";

export const routes = async (app: HonoAppType) => {
  const sessionRepository = new SessionRepository();
  const projectRepository = new ProjectRepository();

  const fileWatcher = getFileWatcher();
  const eventBus = getEventBus();

  if (env.get("NEXT_PHASE") !== "phase-production-build") {
    fileWatcher.startWatching();

    setInterval(() => {
      eventBus.emit("heartbeat", {});
    }, 10 * 1000);
  }

  return (
    app
      // middleware
      .use(configMiddleware)
      .use(async (c, next) => {
        claudeCodeTaskController.updateConfig(c.get("config"));
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
        const { projects } = await projectRepository.getProjects();
        return c.json({ projects });
      })

      .get(
        "/projects/:projectId",
        zValidator("query", z.object({ cursor: z.string().optional() })),
        async (c) => {
          const { projectId } = c.req.param();
          const { cursor } = c.req.valid("query");

          const [{ project }, { sessions, nextCursor }] = await Promise.all([
            projectRepository.getProject(projectId),
            sessionRepository
              .getSessions(projectId, { cursor })
              .then(({ sessions }) => {
                let filteredSessions = sessions;

                // Filter sessions based on hideNoUserMessageSession setting
                if (c.get("config").hideNoUserMessageSession) {
                  filteredSessions = filteredSessions.filter((session) => {
                    return session.meta.firstCommand !== null;
                  });
                }

                // Unify sessions with same title if unifySameTitleSession is enabled
                if (c.get("config").unifySameTitleSession) {
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
                          session.lastModifiedAt >
                          existingSession.lastModifiedAt
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

                return {
                  sessions: filteredSessions,
                  nextCursor: sessions.at(-1)?.id,
                };
              }),
          ] as const);

          return c.json({ project, sessions, nextCursor });
        },
      )

      .get("/projects/:projectId/sessions/:sessionId", async (c) => {
        const { projectId, sessionId } = c.req.param();
        const { session } = await sessionRepository.getSession(
          projectId,
          sessionId,
        );
        return c.json({ session });
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

          const { project } = await projectRepository.getProject(projectId);

          if (project.meta.projectPath === null) {
            return c.json({ error: "Project path not found" }, 400);
          }

          try {
            const result = await getFileCompletion(
              project.meta.projectPath,
              basePath,
            );
            return c.json(result);
          } catch (error) {
            console.error("File completion error:", error);
            return c.json({ error: "Failed to get file completion" }, 500);
          }
        },
      )

      .get("/projects/:projectId/claude-commands", async (c) => {
        const { projectId } = c.req.param();
        const { project } = await projectRepository.getProject(projectId);

        const [globalCommands, projectCommands] = await Promise.allSettled([
          readdir(claudeCommandsDirPath, {
            withFileTypes: true,
          }).then((dirents) =>
            dirents
              .filter((d) => d.isFile() && d.name.endsWith(".md"))
              .map((d) => d.name.replace(/\.md$/, "")),
          ),
          project.meta.projectPath !== null
            ? readdir(
                resolve(project.meta.projectPath, ".claude", "commands"),
                {
                  withFileTypes: true,
                },
              ).then((dirents) =>
                dirents
                  .filter((d) => d.isFile() && d.name.endsWith(".md"))
                  .map((d) => d.name.replace(/\.md$/, "")),
              )
            : [],
        ]);

        return c.json({
          globalCommands:
            globalCommands.status === "fulfilled" ? globalCommands.value : [],
          projectCommands:
            projectCommands.status === "fulfilled" ? projectCommands.value : [],
          defaultCommands: ["init", "compact"],
        });
      })

      .get("/projects/:projectId/git/branches", async (c) => {
        const { projectId } = c.req.param();
        const { project } = await projectRepository.getProject(projectId);

        if (project.meta.projectPath === null) {
          return c.json({ error: "Project path not found" }, 400);
        }

        try {
          const result = await getBranches(project.meta.projectPath);
          return c.json(result);
        } catch (error) {
          console.error("Get branches error:", error);
          if (error instanceof Error) {
            return c.json({ error: error.message }, 400);
          }
          return c.json({ error: "Failed to get branches" }, 500);
        }
      })

      .get("/projects/:projectId/git/commits", async (c) => {
        const { projectId } = c.req.param();
        const { project } = await projectRepository.getProject(projectId);

        if (project.meta.projectPath === null) {
          return c.json({ error: "Project path not found" }, 400);
        }

        try {
          const result = await getCommits(project.meta.projectPath);
          return c.json(result);
        } catch (error) {
          console.error("Get commits error:", error);
          if (error instanceof Error) {
            return c.json({ error: error.message }, 400);
          }
          return c.json({ error: "Failed to get commits" }, 500);
        }
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
          const { project } = await projectRepository.getProject(projectId);

          if (project.meta.projectPath === null) {
            return c.json({ error: "Project path not found" }, 400);
          }

          try {
            const result = await getDiff(
              project.meta.projectPath,
              fromRef,
              toRef,
            );
            return c.json(result);
          } catch (error) {
            console.error("Get diff error:", error);
            if (error instanceof Error) {
              return c.json({ error: error.message }, 400);
            }
            return c.json({ error: "Failed to get diff" }, 500);
          }
        },
      )

      .get("/mcp/list", async (c) => {
        const { servers } = await getMcpList();
        return c.json({ servers });
      })

      .post(
        "/projects/:projectId/new-session",
        zValidator(
          "json",
          z.object({
            message: z.string(),
          }),
        ),
        async (c) => {
          const { projectId } = c.req.param();
          const { message } = c.req.valid("json");
          const { project } = await projectRepository.getProject(projectId);

          if (project.meta.projectPath === null) {
            return c.json({ error: "Project path not found" }, 400);
          }

          const task = await claudeCodeTaskController.startOrContinueTask(
            {
              projectId,
              cwd: project.meta.projectPath,
            },
            message,
          );

          return c.json({
            taskId: task.id,
            sessionId: task.sessionId,
          });
        },
      )

      .post(
        "/projects/:projectId/sessions/:sessionId/resume",
        zValidator(
          "json",
          z.object({
            resumeMessage: z.string(),
          }),
        ),
        async (c) => {
          const { projectId, sessionId } = c.req.param();
          const { resumeMessage } = c.req.valid("json");
          const { project } = await projectRepository.getProject(projectId);

          if (project.meta.projectPath === null) {
            return c.json({ error: "Project path not found" }, 400);
          }

          const task = await claudeCodeTaskController.startOrContinueTask(
            {
              projectId,
              sessionId,
              cwd: project.meta.projectPath,
            },
            resumeMessage,
          );

          return c.json({
            taskId: task.id,
            sessionId: task.sessionId,
          });
        },
      )

      .get("/tasks/alive", async (c) => {
        return c.json({
          aliveTasks: claudeCodeTaskController.aliveTasks.map(
            (task): SerializableAliveTask => ({
              id: task.id,
              status: task.status,
              sessionId: task.sessionId,
            }),
          ),
        });
      })

      .post(
        "/tasks/abort",
        zValidator("json", z.object({ sessionId: z.string() })),
        async (c) => {
          const { sessionId } = c.req.valid("json");
          claudeCodeTaskController.abortTask(sessionId);
          return c.json({ message: "Task aborted" });
        },
      )

      .post(
        "/tasks/permission-response",
        zValidator(
          "json",
          z.object({
            permissionRequestId: z.string(),
            decision: z.enum(["allow", "deny"]),
          }),
        ),
        async (c) => {
          const permissionResponse = c.req.valid("json");
          claudeCodeTaskController.respondToPermissionRequest(
            permissionResponse,
          );
          return c.json({ message: "Permission response received" });
        },
      )

      .get("/sse", async (c) => {
        return streamSSE(
          c,
          async (rawStream) => {
            const stream = writeTypeSafeSSE(rawStream);

            const onSessionListChanged = (
              event: InternalEventDeclaration["sessionListChanged"],
            ) => {
              stream.writeSSE("sessionListChanged", {
                projectId: event.projectId,
              });
            };

            const onSessionChanged = (
              event: InternalEventDeclaration["sessionChanged"],
            ) => {
              stream.writeSSE("sessionChanged", {
                projectId: event.projectId,
                sessionId: event.sessionId,
              });
            };

            const onTaskChanged = (
              event: InternalEventDeclaration["taskChanged"],
            ) => {
              stream.writeSSE("taskChanged", {
                aliveTasks: event.aliveTasks,
                changed: {
                  status: event.changed.status,
                  sessionId: event.changed.sessionId,
                  projectId: event.changed.projectId,
                },
              });

              if (event.changed.sessionId !== undefined) {
                stream.writeSSE("sessionChanged", {
                  projectId: event.changed.projectId,
                  sessionId: event.changed.sessionId,
                });
              }
            };

            eventBus.on("sessionListChanged", onSessionListChanged);
            eventBus.on("sessionChanged", onSessionChanged);
            eventBus.on("taskChanged", onTaskChanged);
            const { connectionPromise } = adaptInternalEventToSSE(rawStream, {
              timeout: 5 /* min */ * 60 /* sec */ * 1000,
              cleanUp: () => {
                eventBus.off("sessionListChanged", onSessionListChanged);
                eventBus.off("sessionChanged", onSessionChanged);
                eventBus.off("taskChanged", onTaskChanged);
              },
            });

            await connectionPromise;
          },
          async (err) => {
            console.error("Streaming error:", err);
          },
        );
      })
  );
};

export type RouteType = Awaited<ReturnType<typeof routes>>;
