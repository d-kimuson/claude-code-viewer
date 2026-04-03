import { eq } from "drizzle-orm";
import { Context, Effect, Layer } from "effect";
import type { PermissionResponse } from "../../../../types/permissions.ts";
import { DrizzleService } from "../../../lib/db/DrizzleService.ts";
import { projects } from "../../../lib/db/schema.ts";
import type { ControllerResponse } from "../../../lib/effect/toEffectResponse.ts";
import type { InferEffect } from "../../../lib/effect/types.ts";
import { generatePermissionRule } from "../functions/permissionRule.ts";
import { ClaudeCodePermissionService } from "../services/ClaudeCodePermissionService.ts";

const LayerImpl = Effect.gen(function* () {
  const claudeCodePermissionService = yield* ClaudeCodePermissionService;
  const { db } = yield* DrizzleService;

  const permissionResponse = (options: { permissionResponse: PermissionResponse }) =>
    Effect.sync(() => {
      const { permissionResponse } = options;

      Effect.runFork(claudeCodePermissionService.respondToPermissionRequest(permissionResponse));

      return {
        status: 200,
        response: {
          message: "Permission response received",
        },
      } as const satisfies ControllerResponse;
    });

  const getPendingPermissionRequests = () =>
    Effect.gen(function* () {
      const permissionRequests = yield* claudeCodePermissionService.getPendingPermissionRequests;

      return {
        status: 200,
        response: {
          permissionRequests,
        },
      } as const satisfies ControllerResponse;
    });

  const generatePermissionRuleForTool = (options: {
    toolName: string;
    toolInput: Record<string, unknown>;
    projectId: string;
  }) =>
    Effect.sync(() => {
      const { toolName, toolInput, projectId } = options;

      // Resolve projectId to the actual project working directory
      const row = db
        .select({ path: projects.path })
        .from(projects)
        .where(eq(projects.id, projectId))
        .get();

      const projectCwd = row?.path ?? "";
      const rule = generatePermissionRule(toolName, toolInput, projectCwd);

      return {
        status: 200,
        response: {
          rule,
        },
      } as const satisfies ControllerResponse;
    });

  return {
    permissionResponse,
    getPendingPermissionRequests,
    generatePermissionRuleForTool,
  };
});

export type IClaudeCodePermissionController = InferEffect<typeof LayerImpl>;
export class ClaudeCodePermissionController extends Context.Tag("ClaudeCodePermissionController")<
  ClaudeCodePermissionController,
  IClaudeCodePermissionController
>() {
  static Live = Layer.effect(this, LayerImpl);
}
