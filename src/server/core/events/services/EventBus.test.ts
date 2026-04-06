import { describe, it } from "@effect/vitest";
import { Effect } from "effect";
import { expect } from "vitest";
import type { PermissionRequest } from "../../../../types/permissions.ts";
import type { PublicSessionProcess } from "../../../../types/session-process.ts";
import type { CCSessionProcessState } from "../../claude-code/models/CCSessionProcess.ts";
import type { InternalEventDeclaration } from "../types/InternalEventDeclaration.ts";
import { EventBus } from "./EventBus.ts";

describe("EventBus", () => {
  describe("basic event processing", () => {
    it.live("can send and receive events with emit and on", () =>
      Effect.gen(function* () {
        const eventBus = yield* EventBus;
        const events: Array<InternalEventDeclaration["heartbeat"]> = [];

        const listener = (event: InternalEventDeclaration["heartbeat"]) => {
          events.push(event);
        };

        yield* eventBus.on("heartbeat", listener);
        yield* eventBus.emit("heartbeat", {});

        // Wait a bit since events are processed asynchronously
        yield* Effect.sleep("10 millis");

        expect(events).toHaveLength(1);
        expect(events[0]).toEqual({});
      }).pipe(Effect.provide(EventBus.Live)),
    );

    it.live("events are delivered to multiple listeners", () =>
      Effect.gen(function* () {
        const eventBus = yield* EventBus;
        const events1: Array<InternalEventDeclaration["sessionChanged"]> = [];
        const events2: Array<InternalEventDeclaration["sessionChanged"]> = [];

        const listener1 = (event: InternalEventDeclaration["sessionChanged"]) => {
          events1.push(event);
        };

        const listener2 = (event: InternalEventDeclaration["sessionChanged"]) => {
          events2.push(event);
        };

        yield* eventBus.on("sessionChanged", listener1);
        yield* eventBus.on("sessionChanged", listener2);

        yield* eventBus.emit("sessionChanged", {
          projectId: "project-1",
          sessionId: "session-1",
        });

        yield* Effect.sleep("10 millis");

        expect(events1).toHaveLength(1);
        expect(events2).toHaveLength(1);
        expect(events1[0]).toEqual({
          projectId: "project-1",
          sessionId: "session-1",
        });
        expect(events2[0]).toEqual({
          projectId: "project-1",
          sessionId: "session-1",
        });
      }).pipe(Effect.provide(EventBus.Live)),
    );

    it.live("can remove listener with off", () =>
      Effect.gen(function* () {
        const eventBus = yield* EventBus;
        const events: Array<InternalEventDeclaration["heartbeat"]> = [];

        const listener = (event: InternalEventDeclaration["heartbeat"]) => {
          events.push(event);
        };

        yield* eventBus.on("heartbeat", listener);
        yield* eventBus.emit("heartbeat", {});
        yield* Effect.sleep("10 millis");

        // Remove listener
        yield* eventBus.off("heartbeat", listener);
        yield* eventBus.emit("heartbeat", {});
        yield* Effect.sleep("10 millis");

        // Only receives first emit
        expect(events).toHaveLength(1);
      }).pipe(Effect.provide(EventBus.Live)),
    );
  });

  describe("different event types", () => {
    it.live("can process sessionListChanged event", () =>
      Effect.gen(function* () {
        const eventBus = yield* EventBus;
        const events: Array<InternalEventDeclaration["sessionListChanged"]> = [];

        const listener = (event: InternalEventDeclaration["sessionListChanged"]) => {
          events.push(event);
        };

        yield* eventBus.on("sessionListChanged", listener);
        yield* eventBus.emit("sessionListChanged", {
          projectId: "project-1",
        });

        yield* Effect.sleep("10 millis");

        expect(events).toHaveLength(1);
        expect(events[0]).toEqual({ projectId: "project-1" });
      }).pipe(Effect.provide(EventBus.Live)),
    );

    it.live("can process sessionProcessChanged event", () =>
      Effect.gen(function* () {
        const eventBus = yield* EventBus;
        const events: Array<InternalEventDeclaration["sessionProcessChanged"]> = [];

        const listener = (event: InternalEventDeclaration["sessionProcessChanged"]) => {
          events.push(event);
        };

        yield* eventBus.on("sessionProcessChanged", listener);

        const mockProcess: CCSessionProcessState = {
          type: "initialized",
          sessionId: "session-1",
          currentTask: {
            status: "running",
            def: {
              type: "new",
              turnId: "task-1",
              sessionId: "session-1",
            },
          },
          rawUserMessage: "test message",
          initContext: {
            initMessage: {
              session_id: "session-1",
            },
          },
          def: {
            sessionProcessId: "process-1",
            projectId: "project-1",
            cwd: "/test/path",
            abortController: new AbortController(),
            setNextMessage: () => {},
            getQueuedMessages: () => [],
            getQueueSize: () => 0,
          },
          tasks: [],
        };

        const publicProcess: PublicSessionProcess = {
          id: "process-1",
          projectId: "project-1",
          sessionId: "session-1",
          status: "running",
          queuedMessageCount: 0,
          queuedMessages: [],
        };

        yield* eventBus.emit("sessionProcessChanged", {
          processes: [publicProcess],
          changed: mockProcess,
        });

        yield* Effect.sleep("10 millis");

        expect(events).toHaveLength(1);
        expect(events.at(0)?.processes).toHaveLength(1);
      }).pipe(Effect.provide(EventBus.Live)),
    );

    it.live("can process permissionRequested event", () =>
      Effect.gen(function* () {
        const eventBus = yield* EventBus;
        const events: Array<InternalEventDeclaration["permissionRequested"]> = [];

        const listener = (event: InternalEventDeclaration["permissionRequested"]) => {
          events.push(event);
        };

        yield* eventBus.on("permissionRequested", listener);

        const mockPermissionRequest: PermissionRequest = {
          id: "permission-1",
          projectId: "project-1",
          sessionId: "session-1",
          turnId: "task-1",
          toolName: "read",
          toolInput: {},
          timestamp: Date.now(),
        };

        yield* eventBus.emit("permissionRequested", {
          permissionRequest: mockPermissionRequest,
        });

        yield* Effect.sleep("10 millis");

        expect(events).toHaveLength(1);
        expect(events.at(0)?.permissionRequest.id).toBe("permission-1");
      }).pipe(Effect.provide(EventBus.Live)),
    );
  });

  describe("error handling", () => {
    it.live("errors thrown by listeners don't affect other listeners", () =>
      Effect.gen(function* () {
        const eventBus = yield* EventBus;
        const events2: Array<InternalEventDeclaration["heartbeat"]> = [];

        const failingListener = (_event: InternalEventDeclaration["heartbeat"]) => {
          throw new Error("Listener error");
        };

        const successListener = (event: InternalEventDeclaration["heartbeat"]) => {
          events2.push(event);
        };

        yield* eventBus.on("heartbeat", failingListener);
        yield* eventBus.on("heartbeat", successListener);

        yield* eventBus.emit("heartbeat", {});
        yield* Effect.sleep("10 millis");

        // failingListener fails, but successListener works normally
        expect(events2).toHaveLength(1);
      }).pipe(Effect.provide(EventBus.Live)),
    );
  });
});
