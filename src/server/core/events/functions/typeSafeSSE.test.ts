import { Effect } from "effect";
import type { SSEStreamingApi } from "hono/streaming";
import { describe, expect, it, vi } from "vitest";
import type { PermissionRequest } from "../../../../types/permissions";
import { TypeSafeSSE } from "./typeSafeSSE";

describe("typeSafeSSE", () => {
  describe("writeTypeSafeSSE", () => {
    it("can correctly format and write SSE events", async () => {
      const writtenEvents: Array<{
        event: string;
        id: string;
        data: string;
      }> = [];

      const mockStream: SSEStreamingApi = {
        writeSSE: vi.fn(async (event) => {
          writtenEvents.push(event);
        }),
      } as unknown as SSEStreamingApi;

      const program = Effect.gen(function* () {
        const typeSafeSSE = yield* TypeSafeSSE;

        yield* typeSafeSSE.writeSSE("heartbeat", {});

        return writtenEvents;
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(TypeSafeSSE.make(mockStream))),
      );

      expect(result).toHaveLength(1);

      const item = result.at(0);
      expect(item).toBeDefined();
      if (!item) {
        throw new Error("item is undefined");
      }

      expect(item.event).toBe("heartbeat");
      expect(item.id).toBeDefined();

      const data = JSON.parse(item.data);
      expect(data.kind).toBe("heartbeat");
      expect(data.timestamp).toBeDefined();
    });

    it("can correctly write connect event", async () => {
      const writtenEvents: Array<{
        event: string;
        id: string;
        data: string;
      }> = [];

      const mockStream: SSEStreamingApi = {
        writeSSE: vi.fn(async (event) => {
          writtenEvents.push(event);
        }),
      } as unknown as SSEStreamingApi;

      const program = Effect.gen(function* () {
        const typeSafeSSE = yield* TypeSafeSSE;

        yield* typeSafeSSE.writeSSE("connect", {});

        return writtenEvents;
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(TypeSafeSSE.make(mockStream))),
      );

      expect(result).toHaveLength(1);
      const item = result.at(0);
      expect(item).toBeDefined();
      if (!item) {
        throw new Error("item is undefined");
      }
      expect(item.event).toBe("connect");

      const data = JSON.parse(item.data);
      expect(data.kind).toBe("connect");
      expect(data.timestamp).toBeDefined();
    });

    it("can correctly write sessionChanged event", async () => {
      const writtenEvents: Array<{
        event: string;
        id: string;
        data: string;
      }> = [];

      const mockStream: SSEStreamingApi = {
        writeSSE: vi.fn(async (event) => {
          writtenEvents.push(event);
        }),
      } as unknown as SSEStreamingApi;

      const program = Effect.gen(function* () {
        const typeSafeSSE = yield* TypeSafeSSE;

        yield* typeSafeSSE.writeSSE("sessionChanged", {
          projectId: "project-1",
          sessionId: "session-1",
        });

        return writtenEvents;
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(TypeSafeSSE.make(mockStream))),
      );

      expect(result).toHaveLength(1);
      const item = result.at(0);
      expect(item).toBeDefined();
      if (!item) {
        throw new Error("item is undefined");
      }
      expect(item.event).toBe("sessionChanged");

      const data = JSON.parse(item.data);
      expect(data.kind).toBe("sessionChanged");
      expect(data.projectId).toBe("project-1");
      expect(data.sessionId).toBe("session-1");
      expect(data.timestamp).toBeDefined();
    });

    it("can correctly write permission_requested event", async () => {
      const writtenEvents: Array<{
        event: string;
        id: string;
        data: string;
      }> = [];

      const mockStream: SSEStreamingApi = {
        writeSSE: vi.fn(async (event) => {
          writtenEvents.push(event);
        }),
      } as unknown as SSEStreamingApi;

      const mockPermissionRequest: PermissionRequest = {
        id: "permission-1",
        sessionId: "session-1",
        turnId: "task-1",
        toolName: "read",
        toolInput: {},
        timestamp: Date.now(),
      };

      const program = Effect.gen(function* () {
        const typeSafeSSE = yield* TypeSafeSSE;

        yield* typeSafeSSE.writeSSE("permissionRequested", {
          permissionRequest: mockPermissionRequest,
        });

        return writtenEvents;
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(TypeSafeSSE.make(mockStream))),
      );

      expect(result).toHaveLength(1);
      const item = result.at(0);
      expect(item).toBeDefined();
      if (!item) {
        throw new Error("item is undefined");
      }
      expect(item.event).toBe("permissionRequested");

      const data = JSON.parse(item.data);
      expect(data.kind).toBe("permissionRequested");
      expect(data.permissionRequest.id).toBe("permission-1");
      expect(data.timestamp).toBeDefined();
    });

    it("can write multiple events consecutively", async () => {
      const writtenEvents: Array<{
        event: string;
        id: string;
        data: string;
      }> = [];

      const mockStream: SSEStreamingApi = {
        writeSSE: vi.fn(async (event) => {
          writtenEvents.push(event);
        }),
      } as unknown as SSEStreamingApi;

      const program = Effect.gen(function* () {
        const typeSafeSSE = yield* TypeSafeSSE;

        yield* typeSafeSSE.writeSSE("connect", {});
        yield* typeSafeSSE.writeSSE("heartbeat", {});
        yield* typeSafeSSE.writeSSE("sessionListChanged", {
          projectId: "project-1",
        });

        return writtenEvents;
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(TypeSafeSSE.make(mockStream))),
      );

      expect(result).toHaveLength(3);
      expect(result.at(0)?.event).toBe("connect");
      expect(result.at(1)?.event).toBe("heartbeat");
      expect(result.at(2)?.event).toBe("sessionListChanged");
    });

    it("assigns unique ID to each event", async () => {
      const writtenEvents: Array<{
        event: string;
        id: string;
        data: string;
      }> = [];

      const mockStream: SSEStreamingApi = {
        writeSSE: vi.fn(async (event) => {
          writtenEvents.push(event);
        }),
      } as unknown as SSEStreamingApi;

      const program = Effect.gen(function* () {
        const typeSafeSSE = yield* TypeSafeSSE;

        yield* typeSafeSSE.writeSSE("heartbeat", {});
        yield* typeSafeSSE.writeSSE("heartbeat", {});
        yield* typeSafeSSE.writeSSE("heartbeat", {});

        return writtenEvents;
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(TypeSafeSSE.make(mockStream))),
      );

      expect(result).toHaveLength(3);
      const ids = result.map((e) => e.id);
      expect(new Set(ids).size).toBe(3); // All IDs are unique
    });
  });
});
