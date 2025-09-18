import type { SSEEventMap } from "../../types/sse";

export const callSSE = () => {
  const eventSource = new EventSource(
    new URL("/api/sse", window.location.origin).href,
  );

  const handleOnOpen = (event: Event) => {
    console.log("SSE connection opened", event);
  };

  eventSource.onopen = handleOnOpen;

  const addEventListener = <EventName extends keyof SSEEventMap>(
    eventName: EventName,
    listener: (event: SSEEventMap[EventName]) => void,
  ) => {
    const callbackFn = (event: MessageEvent) => {
      try {
        const sseEvent: SSEEventMap[EventName] = JSON.parse(event.data);
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
