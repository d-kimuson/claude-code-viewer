import type { CanUseTool, PermissionMode } from "@anthropic-ai/claude-agent-sdk";
import { eq } from "drizzle-orm";
import { Context, Deferred, Effect, Layer, Ref } from "effect";
import { ulid } from "ulid";
import type { PermissionRequest, PermissionResponse } from "../../../../types/permissions.ts";
import { DrizzleService } from "../../../lib/db/DrizzleService.ts";
import { projects } from "../../../lib/db/schema.ts";
import type { InferEffect } from "../../../lib/effect/types.ts";
import { EventBus } from "../../events/services/EventBus.ts";
import { matchAnyRule } from "../functions/permissionRule.ts";
import { SessionAllowlistRepository } from "../infrastructure/SessionAllowlistRepository.ts";
import * as ClaudeCode from "../models/ClaudeCode.ts";
import { ProjectSettingsService } from "./ProjectSettingsService.ts";

const LayerImpl = Effect.gen(function* () {
  const pendingPermissionRequestsRef = yield* Ref.make<Map<string, PermissionRequest>>(new Map());
  const deferredsRef = yield* Ref.make<Map<string, Deferred.Deferred<PermissionResponse, never>>>(
    new Map(),
  );
  const eventBus = yield* EventBus;
  const sessionAllowlistRepository = yield* SessionAllowlistRepository;
  const projectSettingsService = yield* ProjectSettingsService;
  const { db } = yield* DrizzleService;

  /**
   * Resolve a projectId to the actual project working directory path.
   * Returns null if the project is not found or has no path stored.
   */
  const resolveProjectCwd = (projectId: string): Effect.Effect<string | null> =>
    Effect.sync(() => {
      const row = db
        .select({ path: projects.path })
        .from(projects)
        .where(eq(projects.id, projectId))
        .get();
      return row?.path ?? null;
    });

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

        // Check session allowlist for auto-approve before prompting the user
        const allowlist = await Effect.runPromise(
          sessionAllowlistRepository.getAllowlist(sessionId),
        );
        if (allowlist.length > 0) {
          const projectCwd = await Effect.runPromise(resolveProjectCwd(projectId));
          if (projectCwd !== null && matchAnyRule(allowlist, toolName, toolInput, projectCwd)) {
            return {
              behavior: "allow" as const,
              updatedInput: toolInput,
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

        if (response.decision === "allow" || response.decision === "always_allow") {
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

        // Handle always_allow: persist the rule, then resolve as "allow"
        if (
          response.decision === "always_allow" &&
          request !== undefined &&
          response.alwaysAllowRule !== undefined
        ) {
          const rule = response.alwaysAllowRule;

          if (response.alwaysAllowScope === "session") {
            yield* sessionAllowlistRepository.addRule(request.sessionId, rule);
          } else if (response.alwaysAllowScope === "project") {
            const projectPath = yield* resolveProjectCwd(request.projectId);
            if (projectPath !== null) {
              yield* projectSettingsService.addProjectPermissionRule(projectPath, rule).pipe(
                Effect.catchAll((error) =>
                  Effect.gen(function* () {
                    yield* Effect.logWarning(
                      `Failed to persist project permission rule, falling back to session: ${String(error)}`,
                    );
                    yield* sessionAllowlistRepository.addRule(request.sessionId, rule);
                  }),
                ),
              );
            } else {
              // Project path not found — fall back to session-level storage
              yield* sessionAllowlistRepository.addRule(request.sessionId, rule);
            }
          }
        }

        // Resolve the deferred — convert always_allow to allow for the SDK
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
