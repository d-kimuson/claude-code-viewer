import type { SSEEventMap } from "../../types/sse.ts";

export const callSSE = (options?: { onOpen?: (event: Event) => void }) => {
  const { onOpen } = options ?? {};

  const eventSource = new EventSource(new URL("/api/sse", window.location.origin).href);

  const handleOnOpen = (event: Event) => {
    console.log("SSE connection opened", event);
    onOpen?.(event);
  };

  eventSource.onopen = handleOnOpen;

  const addEventListener = <EventName extends keyof SSEEventMap>(
    eventName: EventName,
    listener: (event: SSEEventMap[EventName]) => void,
  ) => {
    const callbackFn = (event: MessageEvent) => {
      try {
        // oxlint-disable-next-line no-unsafe-assignment -- JSON.parse returns unknown-typed data, validated by downstream consumers
        const sseEvent: SSEEventMap[EventName] = JSON.parse(String(event.data));
        listener(sseEvent);
      } catch (error) {
        console.error("Failed to parse SSE event data:", error);
      }
    };
    eventSource.addEventListener(eventName, callbackFn);

    const removeEventListener = () => {
      eventSource.removeEventListener(eventName, callbackFn);
    };

    return {
      removeEventListener,
    } as const;
  };

  const cleanUp = () => {
    eventSource.onopen = null;
    eventSource.onmessage = null;
    eventSource.close();
  };

  return {
    addEventListener,
    cleanUp,
    eventSource,
  } as const;
};
