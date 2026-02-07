import { zValidator } from "@hono/zod-validator";
import { Effect } from "effect";
import { Hono } from "hono";
import { z } from "zod";
import { AgentSessionController } from "../../core/agent-session/presentation/AgentSessionController";
import { ClaudeCodeController } from "../../core/claude-code/presentation/ClaudeCodeController";
import { FileSystemController } from "../../core/file-system/presentation/FileSystemController";
import { GitController } from "../../core/git/presentation/GitController";
import { CommitRequestSchema } from "../../core/git/schema";
import { ProjectController } from "../../core/project/presentation/ProjectController";
import { SessionController } from "../../core/session/presentation/SessionController";
import { effectToResponse } from "../../lib/effect/toEffectResponse";
import type { HonoContext } from "../app";
import { getHonoRuntime } from "../runtime";

const projectRoutes = Effect.gen(function* () {
  const projectController = yield* ProjectController;
  const sessionController = yield* SessionController;
  const agentSessionController = yield* AgentSessionController;
  const claudeCodeController = yield* ClaudeCodeController;
  const fileSystemController = yield* FileSystemController;
  const gitController = yield* GitController;

  const runtime = yield* getHonoRuntime;

  return (
    new Hono<HonoContext>()
      /**
       * Projects
       */
      .get("/", async (c) => {
        const response = await effectToResponse(
          c,
          projectController.getProjects(),
        );
        return response;
      })
      .get(
        "/:projectId",
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
        "/",
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
      .get("/:projectId/latest-session", async (c) => {
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
       * Sessions
       */
      .get("/:projectId/sessions/:sessionId", async (c) => {
        const projectId = c.req.param("projectId");
        const sessionId = c.req.param("sessionId");
        const response = await effectToResponse(
          c,
          sessionController
            .getSession({ projectId, sessionId })
            .pipe(Effect.provide(runtime)),
        );
        return response;
      })
      .get("/:projectId/sessions/:sessionId/export", async (c) => {
        const projectId = c.req.param("projectId");
        const sessionId = c.req.param("sessionId");
        const response = await effectToResponse(
          c,
          sessionController
            .exportSessionHtml({ projectId, sessionId })
            .pipe(Effect.provide(runtime)),
        );
        return response;
      })
      .delete("/:projectId/sessions/:sessionId", async (c) => {
        const projectId = c.req.param("projectId");
        const sessionId = c.req.param("sessionId");
        const response = await effectToResponse(
          c,
          sessionController
            .deleteSession({ projectId, sessionId })
            .pipe(Effect.provide(runtime)),
        );
        return response;
      })

      /**
       * agent sessions
       */
      .get("/:projectId/agent-sessions/:agentId", async (c) => {
        const projectId = c.req.param("projectId");
        const agentId = c.req.param("agentId");
        const response = await effectToResponse(
          c,
          agentSessionController.getAgentSession({ projectId, agentId }),
        );
        return response;
      })

      /**
       * claude code routes
       */
      .get("/:projectId/claude-commands", async (c) => {
        const response = await effectToResponse(
          c,
          claudeCodeController
            .getClaudeCommands({
              ...c.req.param(),
            })
            .pipe(Effect.provide(runtime)),
        );
        return response;
      })
      .get("/:projectId/mcp/list", async (c) => {
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

      /**
       * file system routes
       */
      .get(
        "/:projectId/files",
        zValidator(
          "query",
          z.object({
            filePath: z.string().min(1, "filePath is required"),
          }),
        ),
        async (c) => {
          const { projectId } = c.req.param();
          const { filePath } = c.req.valid("query");
          const response = await effectToResponse(
            c,
            fileSystemController
              .getFileContentRoute({
                projectId,
                filePath,
              })
              .pipe(Effect.provide(runtime)),
          );
          return response;
        },
      )

      /**
       * git routes
       */
      .get("/:projectId/git/current-revisions", async (c) => {
        const projectId = c.req.param("projectId");
        const response = await effectToResponse(
          c,
          gitController
            .getCurrentRevisions({
              projectId,
            })
            .pipe(Effect.provide(runtime)),
        );
        return response;
      })
      .post(
        "/:projectId/git/diff",
        zValidator(
          "json",
          z.object({
            fromRef: z.string().min(1, "fromRef is required"),
            toRef: z.string().min(1, "toRef is required"),
          }),
        ),
        async (c) => {
          const projectId = c.req.param("projectId");
          const response = await effectToResponse(
            c,
            gitController
              .getGitDiff({
                projectId,
                ...c.req.valid("json"),
              })
              .pipe(Effect.provide(runtime)),
          );
          return response;
        },
      )
      .post(
        "/:projectId/git/commit",
        zValidator("json", CommitRequestSchema),
        async (c) => {
          const projectId = c.req.param("projectId");
          const response = await effectToResponse(
            c,
            gitController
              .commitFiles({
                projectId,
                ...c.req.valid("json"),
              })
              .pipe(Effect.provide(runtime)),
          );
          return response;
        },
      )
      .post("/:projectId/git/push", async (c) => {
        const projectId = c.req.param("projectId");
        const response = await effectToResponse(
          c,
          gitController
            .pushCommits({
              projectId,
            })
            .pipe(Effect.provide(runtime)),
        );
        return response;
      })
      .post(
        "/:projectId/git/commit-and-push",
        zValidator("json", CommitRequestSchema),
        async (c) => {
          const projectId = c.req.param("projectId");
          const response = await effectToResponse(
            c,
            gitController
              .commitAndPush({
                projectId,
                ...c.req.valid("json"),
              })
              .pipe(Effect.provide(runtime)),
          );
          return response;
        },
      )
      .get("/:projectId/git/branches", async (c) => {
        const projectId = c.req.param("projectId");
        const response = await effectToResponse(
          c,
          gitController
            .getBranches({
              projectId,
            })
            .pipe(Effect.provide(runtime)),
        );
        return response;
      })
      .post(
        "/:projectId/git/checkout",
        zValidator(
          "json",
          z.object({
            branchName: z.string().min(1, "branchName is required"),
          }),
        ),
        async (c) => {
          const projectId = c.req.param("projectId");
          const response = await effectToResponse(
            c,
            gitController
              .checkoutBranch({
                projectId,
                ...c.req.valid("json"),
              })
              .pipe(Effect.provide(runtime)),
          );
          return response;
        },
      )
  );
});

export { projectRoutes };
