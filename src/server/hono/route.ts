import type { CommandExecutor, FileSystem, Path } from "@effect/platform";
import { zValidator } from "@hono/zod-validator";
import { Effect, Runtime } from "effect";
import { setCookie } from "hono/cookie";
import { streamSSE } from "hono/streaming";
import prexit from "prexit";
import { z } from "zod";
import packageJson from "../../../package.json" with { type: "json" };
import { ClaudeCodeController } from "../core/claude-code/presentation/ClaudeCodeController";
import { ClaudeCodePermissionController } from "../core/claude-code/presentation/ClaudeCodePermissionController";
import { ClaudeCodeSessionProcessController } from "../core/claude-code/presentation/ClaudeCodeSessionProcessController";
import { ClaudeCodeLifeCycleService } from "../core/claude-code/services/ClaudeCodeLifeCycleService";
import { TypeSafeSSE } from "../core/events/functions/typeSafeSSE";
import { SSEController } from "../core/events/presentation/SSEController";
import { FileSystemController } from "../core/file-system/presentation/FileSystemController";
import { GitController } from "../core/git/presentation/GitController";
import { CommitRequestSchema, PushRequestSchema } from "../core/git/schema";
import { EnvService } from "../core/platform/services/EnvService";
import { UserConfigService } from "../core/platform/services/UserConfigService";
import type { ProjectRepository } from "../core/project/infrastructure/ProjectRepository";
import { ProjectController } from "../core/project/presentation/ProjectController";
import type { SchedulerConfigBaseDir } from "../core/scheduler/config";
import { SchedulerController } from "../core/scheduler/presentation/SchedulerController";
import {
  newSchedulerJobSchema,
  updateSchedulerJobSchema,
} from "../core/scheduler/schema";
import type { VirtualConversationDatabase } from "../core/session/infrastructure/VirtualConversationDatabase";
import { SessionController } from "../core/session/presentation/SessionController";
import type { SessionMetaService } from "../core/session/services/SessionMetaService";
import { userConfigSchema } from "../lib/config/config";
import { effectToResponse } from "../lib/effect/toEffectResponse";
import type { HonoAppType } from "./app";
import { InitializeService } from "./initialize";
import { configMiddleware } from "./middleware/config.middleware";

export const routes = (app: HonoAppType) =>
  Effect.gen(function* () {
    // controllers
    const projectController = yield* ProjectController;
    const sessionController = yield* SessionController;
    const gitController = yield* GitController;
    const claudeCodeSessionProcessController =
      yield* ClaudeCodeSessionProcessController;
    const claudeCodePermissionController =
      yield* ClaudeCodePermissionController;
    const sseController = yield* SSEController;
    const fileSystemController = yield* FileSystemController;
    const claudeCodeController = yield* ClaudeCodeController;
    const schedulerController = yield* SchedulerController;

    // services
    const envService = yield* EnvService;
    const userConfigService = yield* UserConfigService;
    const claudeCodeLifeCycleService = yield* ClaudeCodeLifeCycleService;
    const initializeService = yield* InitializeService;

    const runtime = yield* Effect.runtime<
      | EnvService
      | SessionMetaService
      | VirtualConversationDatabase
      | FileSystem.FileSystem
      | Path.Path
      | CommandExecutor.CommandExecutor
      | UserConfigService
      | ClaudeCodeLifeCycleService
      | ProjectRepository
      | SchedulerConfigBaseDir
    >();

    if ((yield* envService.getEnv("NEXT_PHASE")) !== "phase-production-build") {
      yield* initializeService.startInitialization();

      prexit(async () => {
        await Runtime.runPromise(runtime)(initializeService.stopCleanup());
      });
    }

    return (
      app
        // middleware
        .use(configMiddleware)
        .use(async (c, next) => {
          await Effect.runPromise(
            userConfigService.setUserConfig({
              ...c.get("userConfig"),
            }),
          );

          await next();
        })

        // routes
        .get("/config", async (c) => {
          return c.json({
            config: c.get("userConfig"),
          });
        })

        .put("/config", zValidator("json", userConfigSchema), async (c) => {
          const { ...config } = c.req.valid("json");

          setCookie(c, "ccv-config", JSON.stringify(config));

          return c.json({
            config,
          });
        })

        .get("/version", async (c) => {
          return c.json({
            version: packageJson.version,
          });
        })

        /**
         * ProjectController Routes
         */

        .get("/projects", async (c) => {
          const response = await effectToResponse(
            c,
            projectController.getProjects(),
          );
          return response;
        })

        .get(
          "/projects/:projectId",
          zValidator("query", z.object({ cursor: z.string().optional() })),
          async (c) => {
            const response = await effectToResponse(
              c,
              projectController
                .getProject({
                  ...c.req.param(),
                  ...c.req.valid("query"),
                })
                .pipe(Effect.provide(runtime)),
            );
            return response;
          },
        )

        .post(
          "/projects",
          zValidator(
            "json",
            z.object({
              projectPath: z.string().min(1, "Project path is required"),
            }),
          ),
          async (c) => {
            const response = await effectToResponse(
              c,
              projectController
                .createProject({
                  ...c.req.valid("json"),
                })
                .pipe(Effect.provide(runtime)),
            );
            return response;
          },
        )

        .get("/projects/:projectId/latest-session", async (c) => {
          const response = await effectToResponse(
            c,
            projectController
              .getProjectLatestSession({
                ...c.req.param(),
              })
              .pipe(Effect.provide(runtime)),
          );
          return response;
        })

        /**
         * SessionController Routes
         */

        .get("/projects/:projectId/sessions/:sessionId", async (c) => {
          const response = await effectToResponse(
            c,
            sessionController
              .getSession({ ...c.req.param() })
              .pipe(Effect.provide(runtime)),
          );
          return response;
        })

        /**
         * GitController Routes
         */

        .get("/projects/:projectId/git/branches", async (c) => {
          const response = await effectToResponse(
            c,
            gitController
              .getGitBranches({
                ...c.req.param(),
              })
              .pipe(Effect.provide(runtime)),
          );
          return response;
        })

        .get("/projects/:projectId/git/commits", async (c) => {
          const response = await effectToResponse(
            c,
            gitController
              .getGitCommits({
                ...c.req.param(),
              })
              .pipe(Effect.provide(runtime)),
          );
          return response;
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
            const response = await effectToResponse(
              c,
              gitController
                .getGitDiff({
                  ...c.req.param(),
                  ...c.req.valid("json"),
                })
                .pipe(Effect.provide(runtime)),
            );
            return response;
          },
        )

        .post(
          "/projects/:projectId/git/commit",
          zValidator("json", CommitRequestSchema),
          async (c) => {
            const response = await effectToResponse(
              c,
              gitController
                .commitFiles({
                  ...c.req.param(),
                  ...c.req.valid("json"),
                })
                .pipe(Effect.provide(runtime)),
            );
            return response;
          },
        )

        .post(
          "/projects/:projectId/git/push",
          zValidator("json", PushRequestSchema),
          async (c) => {
            const response = await effectToResponse(
              c,
              gitController
                .pushCommits({
                  ...c.req.param(),
                  ...c.req.valid("json"),
                })
                .pipe(Effect.provide(runtime)),
            );
            return response;
          },
        )

        .post(
          "/projects/:projectId/git/commit-and-push",
          zValidator("json", CommitRequestSchema),
          async (c) => {
            const response = await effectToResponse(
              c,
              gitController
                .commitAndPush({
                  ...c.req.param(),
                  ...c.req.valid("json"),
                })
                .pipe(Effect.provide(runtime)),
            );
            return response;
          },
        )

        /**
         * ClaudeCodeController Routes
         */

        .get("/projects/:projectId/claude-commands", async (c) => {
          const response = await effectToResponse(
            c,
            claudeCodeController.getClaudeCommands({
              ...c.req.param(),
            }),
          );
          return response;
        })

        .get("/projects/:projectId/mcp/list", async (c) => {
          const response = await effectToResponse(
            c,
            claudeCodeController
              .getMcpListRoute({
                ...c.req.param(),
              })
              .pipe(Effect.provide(runtime)),
          );
          return response;
        })

        .get("/cc/meta", async (c) => {
          const response = await effectToResponse(
            c,
            claudeCodeController
              .getClaudeCodeMeta()
              .pipe(Effect.provide(runtime)),
          );
          return response;
        })

        .get("/cc/features", async (c) => {
          const response = await effectToResponse(
            c,
            claudeCodeController
              .getAvailableFeatures()
              .pipe(Effect.provide(runtime)),
          );
          return response;
        })

        /**
         * ClaudeCodeSessionProcessController Routes
         */

        .get("/cc/session-processes", async (c) => {
          const response = await effectToResponse(
            c,
            claudeCodeSessionProcessController.getSessionProcesses(),
          );
          return response;
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
            const response = await effectToResponse(
              c,
              claudeCodeSessionProcessController.createSessionProcess(
                c.req.valid("json"),
              ),
            );
            return response;
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
            const response = await effectToResponse(
              c,
              claudeCodeSessionProcessController
                .continueSessionProcess({
                  ...c.req.param(),
                  ...c.req.valid("json"),
                })
                .pipe(Effect.provide(runtime)),
            );
            return response;
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

        /**
         * ClaudeCodePermissionController Routes
         */

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
            const response = await effectToResponse(
              c,
              claudeCodePermissionController.permissionResponse({
                permissionResponse: c.req.valid("json"),
              }),
            );
            return response;
          },
        )

        /**
         * SSEController Routes
         */

        .get("/sse", async (c) => {
          return streamSSE(
            c,
            async (rawStream) => {
              await Runtime.runPromise(runtime)(
                sseController
                  .handleSSE(rawStream)
                  .pipe(Effect.provide(TypeSafeSSE.make(rawStream))),
              );
            },
            async (err) => {
              console.error("Streaming error:", err);
            },
          );
        })

        /**
         * SchedulerController Routes
         */

        .get("/scheduler/jobs", async (c) => {
          const response = await effectToResponse(
            c,
            schedulerController.getJobs().pipe(Effect.provide(runtime)),
          );
          return response;
        })

        .post(
          "/scheduler/jobs",
          zValidator("json", newSchedulerJobSchema),
          async (c) => {
            const response = await effectToResponse(
              c,
              schedulerController
                .addJob({
                  job: c.req.valid("json"),
                })
                .pipe(Effect.provide(runtime)),
            );
            return response;
          },
        )

        .patch(
          "/scheduler/jobs/:id",
          zValidator("json", updateSchedulerJobSchema),
          async (c) => {
            const response = await effectToResponse(
              c,
              schedulerController
                .updateJob({
                  id: c.req.param("id"),
                  job: c.req.valid("json"),
                })
                .pipe(Effect.provide(runtime)),
            );
            return response;
          },
        )

        .delete("/scheduler/jobs/:id", async (c) => {
          const response = await effectToResponse(
            c,
            schedulerController
              .deleteJob({
                id: c.req.param("id"),
              })
              .pipe(Effect.provide(runtime)),
          );
          return response;
        })

        /**
         * FileSystemController Routes
         */

        .get(
          "/fs/file-completion",
          zValidator(
            "query",
            z.object({
              projectId: z.string(),
              basePath: z.string().optional().default("/"),
            }),
          ),
          async (c) => {
            const response = await effectToResponse(
              c,
              fileSystemController.getFileCompletionRoute({
                ...c.req.valid("query"),
              }),
            );

            return response;
          },
        )

        .get(
          "/fs/directory-browser",
          zValidator(
            "query",
            z.object({
              currentPath: z.string().optional(),
            }),
          ),
          async (c) => {
            const response = await effectToResponse(
              c,
              fileSystemController.getDirectoryListingRoute({
                ...c.req.valid("query"),
              }),
            );
            return response;
          },
        )
    );
  });

export type RouteType = ReturnType<typeof routes> extends Effect.Effect<
  infer A,
  unknown,
  unknown
>
  ? A
  : never;
