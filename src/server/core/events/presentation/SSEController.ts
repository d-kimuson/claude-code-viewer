import { Context, Effect, Layer } from "effect";
import type { SSEStreamingApi } from "hono/streaming";
import type { InferEffect } from "../../../lib/effect/types";
import { adaptInternalEventToSSE } from "../functions/adaptInternalEventToSSE";
import { TypeSafeSSE } from "../functions/typeSafeSSE";
import { EventBus } from "../services/EventBus";
import type { InternalEventDeclaration } from "../types/InternalEventDeclaration";

const LayerImpl = Effect.gen(function* () {
  const eventBus = yield* EventBus;

  const handleSSE = (rawStream: SSEStreamingApi) =>
    Effect.gen(function* () {
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

      const onAgentSessionChanged = (
        event: InternalEventDeclaration["agentSessionChanged"],
      ) => {
        Effect.runFork(
          typeSafeSSE.writeSSE("agentSessionChanged", {
            projectId: event.projectId,
            agentSessionId: event.agentSessionId,
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

      const onActivityEntry = (
        event: InternalEventDeclaration["activityEntry"],
      ) => {
        Effect.runFork(
          typeSafeSSE.writeSSE("activityEntry", {
            entry: {
              id: event.entry.id,
              projectId: event.entry.projectId,
              sessionId: event.entry.sessionId,
              entryType: event.entry.entryType,
              preview: event.entry.preview,
              timestamp: event.entry.timestamp,
            },
          }),
        );
      };

      yield* eventBus.on("sessionListChanged", onSessionListChanged);
      yield* eventBus.on("sessionChanged", onSessionChanged);
      yield* eventBus.on("agentSessionChanged", onAgentSessionChanged);
      yield* eventBus.on("sessionProcessChanged", onSessionProcessChanged);
      yield* eventBus.on("heartbeat", onHeartbeat);
      yield* eventBus.on("permissionRequested", onPermissionRequested);
      yield* eventBus.on("activityEntry", onActivityEntry);

      const { connectionPromise } = adaptInternalEventToSSE(rawStream, {
        timeout: 5 /* min */ * 60 /* sec */ * 1000,
        cleanUp: async () => {
          await Effect.runPromise(
            Effect.gen(function* () {
              yield* eventBus.off("sessionListChanged", onSessionListChanged);
              yield* eventBus.off("sessionChanged", onSessionChanged);
              yield* eventBus.off("agentSessionChanged", onAgentSessionChanged);
              yield* eventBus.off(
                "sessionProcessChanged",
                onSessionProcessChanged,
              );
              yield* eventBus.off("heartbeat", onHeartbeat);
              yield* eventBus.off("permissionRequested", onPermissionRequested);
              yield* eventBus.off("activityEntry", onActivityEntry);
            }),
          );
        },
      });

      yield* Effect.promise(() => connectionPromise);
    });

  return {
    handleSSE,
  };
});

export type ISSEController = InferEffect<typeof LayerImpl>;
export class SSEController extends Context.Tag("SSEController")<
  SSEController,
  ISSEController
>() {
  static Live = Layer.effect(this, LayerImpl);
}
