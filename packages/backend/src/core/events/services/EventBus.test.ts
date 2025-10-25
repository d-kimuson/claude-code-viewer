import type { PermissionRequest } from "@claude-code-viewer/shared/types/permissions";
import type { PublicSessionProcess } from "@claude-code-viewer/shared/types/session-process";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import type { CCSessionProcessState } from "../../claude-code/models/CCSessionProcess";
import type { InternalEventDeclaration } from "../types/InternalEventDeclaration";
import { EventBus } from "./EventBus";

describe("EventBus", () => {
  describe("basic event processing", () => {
    it("can send and receive events with emit and on", async () => {
      const program = Effect.gen(function* () {
        const eventBus = yield* EventBus;
        const events: Array<InternalEventDeclaration["heartbeat"]> = [];

        const listener = (event: InternalEventDeclaration["heartbeat"]) => {
          events.push(event);
        };

        yield* eventBus.on("heartbeat", listener);
        yield* eventBus.emit("heartbeat", {});

        // Wait a bit since events are processed asynchronously
        yield* Effect.sleep("10 millis");

        return events;
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(EventBus.Live)),
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({});
    });

    it("events are delivered to multiple listeners", async () => {
      const program = Effect.gen(function* () {
        const eventBus = yield* EventBus;
        const events1: Array<InternalEventDeclaration["sessionChanged"]> = [];
        const events2: Array<InternalEventDeclaration["sessionChanged"]> = [];

        const listener1 = (
          event: InternalEventDeclaration["sessionChanged"],
        ) => {
          events1.push(event);
        };

        const listener2 = (
          event: InternalEventDeclaration["sessionChanged"],
        ) => {
          events2.push(event);
        };

        yield* eventBus.on("sessionChanged", listener1);
        yield* eventBus.on("sessionChanged", listener2);

        yield* eventBus.emit("sessionChanged", {
          projectId: "project-1",
          sessionId: "session-1",
        });

        yield* Effect.sleep("10 millis");

        return { events1, events2 };
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(EventBus.Live)),
      );

      expect(result.events1).toHaveLength(1);
      expect(result.events2).toHaveLength(1);
      expect(result.events1[0]).toEqual({
        projectId: "project-1",
        sessionId: "session-1",
      });
      expect(result.events2[0]).toEqual({
        projectId: "project-1",
        sessionId: "session-1",
      });
    });

    it("can remove listener with off", async () => {
      const program = Effect.gen(function* () {
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

        return events;
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(EventBus.Live)),
      );

      // Only receives first emit
      expect(result).toHaveLength(1);
    });
  });

  describe("different event types", () => {
    it("can process sessionListChanged event", async () => {
      const program = Effect.gen(function* () {
        const eventBus = yield* EventBus;
        const events: Array<InternalEventDeclaration["sessionListChanged"]> =
          [];

        const listener = (
          event: InternalEventDeclaration["sessionListChanged"],
        ) => {
          events.push(event);
        };

        yield* eventBus.on("sessionListChanged", listener);
        yield* eventBus.emit("sessionListChanged", {
          projectId: "project-1",
        });

        yield* Effect.sleep("10 millis");

        return events;
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(EventBus.Live)),
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ projectId: "project-1" });
    });

    it("can process sessionProcessChanged event", async () => {
      const program = Effect.gen(function* () {
        const eventBus = yield* EventBus;
        const events: Array<InternalEventDeclaration["sessionProcessChanged"]> =
          [];

        const listener = (
          event: InternalEventDeclaration["sessionProcessChanged"],
        ) => {
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
              taskId: "task-1",
            },
          },
          rawUserMessage: "test message",
          initContext: {} as never,
          def: {
            sessionProcessId: "process-1",
            projectId: "project-1",
            cwd: "/test/path",
            abortController: new AbortController(),
            setNextMessage: () => {},
          },
          tasks: [],
        };

        const publicProcess: PublicSessionProcess = {
          id: "process-1",
          projectId: "project-1",
          sessionId: "session-1",
          status: "running",
        };

        yield* eventBus.emit("sessionProcessChanged", {
          processes: [publicProcess],
          changed: mockProcess,
        });

        yield* Effect.sleep("10 millis");

        return events;
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(EventBus.Live)),
      );

      expect(result).toHaveLength(1);
      expect(result.at(0)?.processes).toHaveLength(1);
    });

    it("can process permissionRequested event", async () => {
      const program = Effect.gen(function* () {
        const eventBus = yield* EventBus;
        const events: Array<InternalEventDeclaration["permissionRequested"]> =
          [];

        const listener = (
          event: InternalEventDeclaration["permissionRequested"],
        ) => {
          events.push(event);
        };

        yield* eventBus.on("permissionRequested", listener);

        const mockPermissionRequest: PermissionRequest = {
          id: "permission-1",
          taskId: "task-1",
          toolName: "read",
          toolInput: {},
          timestamp: Date.now(),
        };

        yield* eventBus.emit("permissionRequested", {
          permissionRequest: mockPermissionRequest,
        });

        yield* Effect.sleep("10 millis");

        return events;
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(EventBus.Live)),
      );

      expect(result).toHaveLength(1);
      expect(result.at(0)?.permissionRequest.id).toBe("permission-1");
    });
  });

  describe("error handling", () => {
    it("errors thrown by listeners don't affect other listeners", async () => {
      const program = Effect.gen(function* () {
        const eventBus = yield* EventBus;
        const events1: Array<InternalEventDeclaration["heartbeat"]> = [];
        const events2: Array<InternalEventDeclaration["heartbeat"]> = [];

        const failingListener = (
          _event: InternalEventDeclaration["heartbeat"],
        ) => {
          throw new Error("Listener error");
        };

        const successListener = (
          event: InternalEventDeclaration["heartbeat"],
        ) => {
          events2.push(event);
        };

        yield* eventBus.on("heartbeat", failingListener);
        yield* eventBus.on("heartbeat", successListener);

        yield* eventBus.emit("heartbeat", {});
        yield* Effect.sleep("10 millis");

        return { events1, events2 };
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(EventBus.Live)),
      );

      // failingListener fails, but successListener works normally
      expect(result.events2).toHaveLength(1);
    });
  });
});
