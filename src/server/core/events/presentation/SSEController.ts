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

      const onSessionListChanged = (event: InternalEventDeclaration["sessionListChanged"]) => {
        Effect.runFork(
          typeSafeSSE.writeSSE("sessionListChanged", {
            projectId: event.projectId,
          }),
        );
      };

      const onSessionChanged = (event: InternalEventDeclaration["sessionChanged"]) => {
        Effect.runFork(
          typeSafeSSE.writeSSE("sessionChanged", {
            projectId: event.projectId,
            sessionId: event.sessionId,
          }),
        );
      };

      const onAgentSessionChanged = (event: InternalEventDeclaration["agentSessionChanged"]) => {
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

      const onPermissionRequested = (event: InternalEventDeclaration["permissionRequested"]) => {
        Effect.runFork(
          typeSafeSSE.writeSSE("permissionRequested", {
            sessionId: event.permissionRequest.sessionId,
          }),
        );
      };

      const onPermissionResolved = (event: InternalEventDeclaration["permissionResolved"]) => {
        Effect.runFork(
          typeSafeSSE.writeSSE("permissionResolved", {
            sessionId: event.sessionId,
          }),
        );
      };

      const onQuestionRequested = (event: InternalEventDeclaration["questionRequested"]) => {
        Effect.runFork(
          typeSafeSSE.writeSSE("questionRequested", {
            sessionId: event.questionRequest.sessionId,
          }),
        );
      };

      const onQuestionResolved = (event: InternalEventDeclaration["questionResolved"]) => {
        Effect.runFork(
          typeSafeSSE.writeSSE("questionResolved", {
            sessionId: event.sessionId,
          }),
        );
      };

      const onNotificationCreated = (event: InternalEventDeclaration["notificationCreated"]) => {
        Effect.runFork(
          typeSafeSSE.writeSSE("notificationCreated", {
            notification: event.notification,
          }),
        );
      };

      const onNotificationConsumed = (event: InternalEventDeclaration["notificationConsumed"]) => {
        Effect.runFork(
          typeSafeSSE.writeSSE("notificationConsumed", {
            sessionId: event.sessionId,
          }),
        );
      };

      yield* eventBus.on("sessionListChanged", onSessionListChanged);
      yield* eventBus.on("sessionChanged", onSessionChanged);
      yield* eventBus.on("agentSessionChanged", onAgentSessionChanged);
      yield* eventBus.on("sessionProcessChanged", onSessionProcessChanged);
      yield* eventBus.on("heartbeat", onHeartbeat);
      yield* eventBus.on("permissionRequested", onPermissionRequested);
      yield* eventBus.on("permissionResolved", onPermissionResolved);
      yield* eventBus.on("questionRequested", onQuestionRequested);
      yield* eventBus.on("questionResolved", onQuestionResolved);
      yield* eventBus.on("notificationCreated", onNotificationCreated);
      yield* eventBus.on("notificationConsumed", onNotificationConsumed);

      const { connectionPromise } = adaptInternalEventToSSE(rawStream, {
        timeout: 5 /* min */ * 60 /* sec */ * 1000,
        cleanUp: async () => {
          await Effect.runPromise(
            Effect.gen(function* () {
              yield* eventBus.off("sessionListChanged", onSessionListChanged);
              yield* eventBus.off("sessionChanged", onSessionChanged);
              yield* eventBus.off("agentSessionChanged", onAgentSessionChanged);
              yield* eventBus.off("sessionProcessChanged", onSessionProcessChanged);
              yield* eventBus.off("heartbeat", onHeartbeat);
              yield* eventBus.off("permissionRequested", onPermissionRequested);
              yield* eventBus.off("permissionResolved", onPermissionResolved);
              yield* eventBus.off("questionRequested", onQuestionRequested);
              yield* eventBus.off("questionResolved", onQuestionResolved);
              yield* eventBus.off("notificationCreated", onNotificationCreated);
              yield* eventBus.off("notificationConsumed", onNotificationConsumed);
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
export class SSEController extends Context.Tag("SSEController")<SSEController, ISSEController>() {
  static Live = Layer.effect(this, LayerImpl);
}
