import { Effect } from "effect";
import { SSEStreamingApi } from "hono/streaming";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { TypeSafeSSE } from "./typeSafeSSE";

const baseEventSchema = z.object({
  kind: z.string(),
  timestamp: z.string(),
});

const sessionChangedEventSchema = baseEventSchema.extend({
  kind: z.literal("sessionChanged"),
  projectId: z.string(),
  sessionId: z.string(),
});

const permissionRequestedEventSchema = baseEventSchema.extend({
  kind: z.literal("permissionRequested"),
  sessionId: z.string(),
});

const parseBaseEvent = (json: string) => {
  return baseEventSchema.parse(JSON.parse(json));
};

const parseSessionChangedEvent = (json: string) => {
  return sessionChangedEventSchema.parse(JSON.parse(json));
};

const parsePermissionRequestedEvent = (json: string) => {
  return permissionRequestedEventSchema.parse(JSON.parse(json));
};

const createMockStream = (writtenEvents: Array<{ event: string; id: string; data: string }>) => {
  const stream = new SSEStreamingApi(new WritableStream(), new ReadableStream());
  vi.spyOn(stream, "writeSSE").mockImplementation(async (event) => {
    if (typeof event.event !== "string" || typeof event.id !== "string") {
      throw new Error("Unexpected SSE event");
    }

    const data = await event.data;
    writtenEvents.push({
      event: event.event,
      id: event.id,
      data,
    });
  });
  return stream;
};

describe("typeSafeSSE", () => {
  describe("writeTypeSafeSSE", () => {
    it("can correctly format and write SSE events", async () => {
      const writtenEvents: Array<{
        event: string;
        id: string;
        data: string;
      }> = [];

      const mockStream = createMockStream(writtenEvents);

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

      const data = parseBaseEvent(item.data);
      expect(data.kind).toBe("heartbeat");
      expect(data.timestamp).toBeDefined();
    });

    it("can correctly write connect event", async () => {
      const writtenEvents: Array<{
        event: string;
        id: string;
        data: string;
      }> = [];

      const mockStream = createMockStream(writtenEvents);

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

      const data = parseBaseEvent(item.data);
      expect(data.kind).toBe("connect");
      expect(data.timestamp).toBeDefined();
    });

    it("can correctly write sessionChanged event", async () => {
      const writtenEvents: Array<{
        event: string;
        id: string;
        data: string;
      }> = [];

      const mockStream = createMockStream(writtenEvents);

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

      const data = parseSessionChangedEvent(item.data);
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

      const mockStream = createMockStream(writtenEvents);

      const program = Effect.gen(function* () {
        const typeSafeSSE = yield* TypeSafeSSE;

        yield* typeSafeSSE.writeSSE("permissionRequested", {
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
      expect(item.event).toBe("permissionRequested");

      const data = parsePermissionRequestedEvent(item.data);
      expect(data.kind).toBe("permissionRequested");
      expect(data.sessionId).toBe("session-1");
      expect(data.timestamp).toBeDefined();
    });

    it("can write multiple events consecutively", async () => {
      const writtenEvents: Array<{
        event: string;
        id: string;
        data: string;
      }> = [];

      const mockStream = createMockStream(writtenEvents);

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

      const mockStream = createMockStream(writtenEvents);

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
