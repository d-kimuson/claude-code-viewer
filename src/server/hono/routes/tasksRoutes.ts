import { zValidator } from "@hono/zod-validator";
import { Effect } from "effect";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { ApplicationContext } from "../../core/platform/services/ApplicationContext.ts";
import { decodeProjectId, validateProjectPath } from "../../core/project/functions/id.ts";
import { TasksController } from "../../core/tasks/presentation/TasksController.ts";
import { TaskCreateSchema, TaskUpdateSchema } from "../../core/tasks/schema.ts";
import { effectToResponse } from "../../lib/effect/toEffectResponse.ts";
import type { HonoContext } from "../app.ts";
import { getHonoRuntime } from "../runtime.ts";

const getClaudeProjectsDirPath = Effect.gen(function* () {
  const applicationContext = yield* ApplicationContext;
  const claudeCodePaths = yield* applicationContext.claudeCodePaths;
  return claudeCodePaths.claudeProjectsDirPath;
});

const tasksRoutes = Effect.gen(function* () {
  const tasksController = yield* TasksController;
  const runtime = yield* getHonoRuntime;

  return new Hono<HonoContext>()
    .get(
      "/",
      zValidator(
        "query",
        z.object({
          projectId: z.string(),
          sessionId: z.string().optional(),
        }),
      ),
      async (c) => {
        const { projectId, sessionId } = c.req.valid("query");
        const projectPath = decodeProjectId(projectId);

        const claudeProjectsDirPath = await Effect.runPromise(
          getClaudeProjectsDirPath.pipe(Effect.provide(runtime)),
        );
        if (!validateProjectPath(projectPath, claudeProjectsDirPath)) {
          throw new HTTPException(403, { message: "Invalid project path" });
        }

        const status = 200 as const;

        const response = await effectToResponse(
          c,
          tasksController.listTasks(projectPath, sessionId).pipe(
            Effect.map((tasks) => ({
              status,
              response: tasks,
            })),
            Effect.provide(runtime),
          ),
        );
        return response;
      },
    )
    .post(
      "/",
      zValidator(
        "query",
        z.object({
          projectId: z.string(),
          sessionId: z.string().optional(),
        }),
      ),
      zValidator("json", TaskCreateSchema),
      async (c) => {
        const { projectId, sessionId } = c.req.valid("query");
        const body = c.req.valid("json");
        const projectPath = decodeProjectId(projectId);

        const claudeProjectsDirPath = await Effect.runPromise(
          getClaudeProjectsDirPath.pipe(Effect.provide(runtime)),
        );
        if (!validateProjectPath(projectPath, claudeProjectsDirPath)) {
          throw new HTTPException(403, { message: "Invalid project path" });
        }

        const status = 200 as const;

        const response = await effectToResponse(
          c,
          tasksController.createTask(projectPath, body, sessionId).pipe(
            Effect.map((task) => ({
              status,
              response: task,
            })),
            Effect.provide(runtime),
          ),
        );
        return response;
      },
    )
    .patch(
      "/:taskId",
      zValidator(
        "query",
        z.object({
          projectId: z.string(),
          sessionId: z.string().optional(),
        }),
      ),
      zValidator("json", TaskUpdateSchema.omit({ taskId: true })),
      async (c) => {
        const { taskId } = c.req.param();
        const { projectId, sessionId } = c.req.valid("query");
        const body = c.req.valid("json");
        const projectPath = decodeProjectId(projectId);

        const claudeProjectsDirPath = await Effect.runPromise(
          getClaudeProjectsDirPath.pipe(Effect.provide(runtime)),
        );
        if (!validateProjectPath(projectPath, claudeProjectsDirPath)) {
          throw new HTTPException(403, { message: "Invalid project path" });
        }

        const status = 200 as const;

        const response = await effectToResponse(
          c,
          tasksController.updateTask(projectPath, { ...body, taskId }, sessionId).pipe(
            Effect.map((task) => ({
              status,
              response: task,
            })),
            Effect.provide(runtime),
          ),
        );
        return response;
      },
    );
});

export { tasksRoutes };
