import type { SSEStreamingApi } from "hono/streaming";
import { getEventBus } from "./EventBus";
import type { InternalEventDeclaration } from "./InternalEventDeclaration";
import { writeTypeSafeSSE } from "./typeSafeSSE";

export const adaptInternalEventToSSE = (
  rawStream: SSEStreamingApi,
  options?: {
    timeout?: number;
    cleanUp?: () => void | Promise<void>;
  },
) => {
  const { timeout = 60 * 1000, cleanUp } = options ?? {};

  console.log("SSE connection started");

  const eventBus = getEventBus();

  const stream = writeTypeSafeSSE(rawStream);

  const abortController = new AbortController();
  let connectionResolve: (() => void) | undefined;
  const connectionPromise = new Promise<void>((resolve) => {
    connectionResolve = resolve;
  });

  const closeConnection = () => {
    console.log("SSE connection closed");
    connectionResolve?.();
    abortController.abort();

    eventBus.off("heartbeat", heartbeat);
    cleanUp?.();
  };

  rawStream.onAbort(() => {
    console.log("SSE connection aborted");
    closeConnection();
  });

  // Event Listeners
  const heartbeat = (event: InternalEventDeclaration["heartbeat"]) => {
    stream.writeSSE("heartbeat", {
      ...event,
    });
  };

  eventBus.on("heartbeat", heartbeat);

  stream.writeSSE("connect", {
    timestamp: new Date().toISOString(),
  });

  setTimeout(() => {
    closeConnection();
  }, timeout);

  return {
    connectionPromise,
  } as const;
};
