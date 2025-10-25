import type { PermissionResponse } from "@claude-code-viewer/shared/types/permissions";
import { Context, Effect, Layer } from "effect";
import type { ControllerResponse } from "../../../lib/effect/toEffectResponse";
import type { InferEffect } from "../../../lib/effect/types";
import { ClaudeCodePermissionService } from "../services/ClaudeCodePermissionService";

const LayerImpl = Effect.gen(function* () {
  const claudeCodePermissionService = yield* ClaudeCodePermissionService;

  const permissionResponse = (options: {
    permissionResponse: PermissionResponse;
  }) =>
    Effect.sync(() => {
      const { permissionResponse } = options;

      Effect.runFork(
        claudeCodePermissionService.respondToPermissionRequest(
          permissionResponse,
        ),
      );

      return {
        status: 200,
        response: {
          message: "Permission response received",
        },
      } as const satisfies ControllerResponse;
    });

  return {
    permissionResponse,
  };
});

export type IClaudeCodePermissionController = InferEffect<typeof LayerImpl>;
export class ClaudeCodePermissionController extends Context.Tag(
  "ClaudeCodePermissionController",
)<ClaudeCodePermissionController, IClaudeCodePermissionController>() {
  static Live = Layer.effect(this, LayerImpl);
}
