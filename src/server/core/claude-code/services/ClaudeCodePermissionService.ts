import type { CanUseTool, PermissionMode } from "@anthropic-ai/claude-agent-sdk";
import { Context, Deferred, Effect, Layer, Ref } from "effect";
import { ulid } from "ulid";
import type { PermissionRequest, PermissionResponse } from "../../../../types/permissions";
import type { InferEffect } from "../../../lib/effect/types";
import { EventBus } from "../../events/services/EventBus";
import * as ClaudeCode from "../models/ClaudeCode";

const LayerImpl = Effect.gen(function* () {
  const pendingPermissionRequestsRef = yield* Ref.make<Map<string, PermissionRequest>>(new Map());
  const deferredsRef = yield* Ref.make<Map<string, Deferred.Deferred<PermissionResponse, never>>>(
    new Map(),
  );
  const eventBus = yield* EventBus;

  const waitPermissionResponse = (request: PermissionRequest) =>
    Effect.gen(function* () {
      const deferred = yield* Deferred.make<PermissionResponse, never>();

      yield* Ref.update(deferredsRef, (deferreds) => {
        const next = new Map(deferreds);
        next.set(request.id, deferred);
        return next;
      });

      yield* Ref.update(pendingPermissionRequestsRef, (requests) => {
        const next = new Map(requests);
        next.set(request.id, request);
        return next;
      });

      yield* eventBus.emit("permissionRequested", {
        permissionRequest: request,
      });

      const response = yield* Deferred.await(deferred);

      yield* Ref.update(pendingPermissionRequestsRef, (requests) => {
        const next = new Map(requests);
        next.delete(request.id);
        return next;
      });

      yield* Ref.update(deferredsRef, (deferreds) => {
        const next = new Map(deferreds);
        next.delete(request.id);
        return next;
      });

      return response;
    });

  const createCanUseToolRelatedOptions = (options: {
    turnId: string;
    projectId: string;
    permissionMode?: PermissionMode;
    sessionId: string;
  }) => {
    const { turnId, projectId, sessionId } = options;
    const permissionMode = options.permissionMode ?? "default";

    return Effect.gen(function* () {
      const claudeCodeConfig = yield* ClaudeCode.Config;

      if (!ClaudeCode.getAvailableFeatures(claudeCodeConfig.claudeCodeVersion).canUseTool) {
        return {
          permissionMode: "bypassPermissions",
        } as const;
      }

      const canUseTool: CanUseTool = async (toolName, toolInput, _options) => {
        if (permissionMode !== "default") {
          // Convert Claude Code permission modes to canUseTool behaviors
          if (permissionMode === "bypassPermissions" || permissionMode === "acceptEdits") {
            return {
              behavior: "allow" as const,
              updatedInput: toolInput,
            };
          } else {
            // plan mode should deny actual tool execution
            return {
              behavior: "deny" as const,
              message: "Tool execution is disabled in plan mode",
            };
          }
        }

        const permissionRequest: PermissionRequest = {
          id: ulid(),
          turnId,
          projectId,
          sessionId,
          toolName,
          toolInput,
          timestamp: Date.now(),
        };

        const response = await Effect.runPromise(waitPermissionResponse(permissionRequest));

        if (response.decision === "allow") {
          return {
            behavior: "allow" as const,
            updatedInput: toolInput,
          };
        } else {
          return {
            behavior: "deny" as const,
            message: "Permission denied by user",
          };
        }
      };

      return {
        canUseTool,
        permissionMode,
      } as const;
    });
  };

  const respondToPermissionRequest = (response: PermissionResponse): Effect.Effect<void> =>
    Effect.gen(function* () {
      const deferreds = yield* Ref.get(deferredsRef);
      const deferred = deferreds.get(response.permissionRequestId);

      if (deferred !== undefined) {
        // Look up the sessionId before deleting from the map
        const pendingRequests = yield* Ref.get(pendingPermissionRequestsRef);
        const request = pendingRequests.get(response.permissionRequestId);

        yield* Deferred.succeed(deferred, response);

        yield* Ref.update(pendingPermissionRequestsRef, (requests) => {
          const next = new Map(requests);
          next.delete(response.permissionRequestId);
          return next;
        });

        yield* Ref.update(deferredsRef, (ds) => {
          const next = new Map(ds);
          next.delete(response.permissionRequestId);
          return next;
        });

        if (request !== undefined) {
          yield* eventBus.emit("permissionResolved", {
            sessionId: request.sessionId,
          });
        }
      }
    });

  const cancelPendingRequests = (sessionId: string): Effect.Effect<void> =>
    Effect.gen(function* () {
      const pendingRequests = yield* Ref.get(pendingPermissionRequestsRef);
      const deferreds = yield* Ref.get(deferredsRef);

      const matchingRequestIds: string[] = [];
      for (const [id, request] of pendingRequests) {
        if (request.sessionId === sessionId) {
          matchingRequestIds.push(id);
          const deferred = deferreds.get(id);
          if (deferred !== undefined) {
            const denyResponse: PermissionResponse = {
              permissionRequestId: request.id,
              decision: "deny",
            };
            yield* Deferred.succeed(deferred, denyResponse);
          }
        }
      }

      if (matchingRequestIds.length > 0) {
        yield* Ref.update(pendingPermissionRequestsRef, (requests) => {
          const next = new Map(requests);
          for (const id of matchingRequestIds) {
            next.delete(id);
          }
          return next;
        });

        yield* Ref.update(deferredsRef, (ds) => {
          const next = new Map(ds);
          for (const id of matchingRequestIds) {
            next.delete(id);
          }
          return next;
        });
      }
    });

  const getPendingPermissionRequests = Effect.gen(function* () {
    const pendingRequests = yield* Ref.get(pendingPermissionRequestsRef);
    return [...pendingRequests.values()];
  });

  return {
    createCanUseToolRelatedOptions,
    respondToPermissionRequest,
    cancelPendingRequests,
    getPendingPermissionRequests,
  };
});

export type IClaudeCodePermissionService = InferEffect<typeof LayerImpl>;

export class ClaudeCodePermissionService extends Context.Tag("ClaudeCodePermissionService")<
  ClaudeCodePermissionService,
  IClaudeCodePermissionService
>() {
  static Live = Layer.effect(this, LayerImpl);
}
