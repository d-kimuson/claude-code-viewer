import { useEffect } from "react";
import type { SSEEvent } from "../../../types/sse";
import { type EventListener, useSSEContext } from "../SSEContext";

/**
 * Custom hook to listen for specific SSE events
 * @param eventType - The type of event to listen for
 * @param listener - The callback function to execute when the event is received
 * @param deps - Dependencies array for the listener function (similar to useEffect)
 */
export const useServerEventListener = <T extends SSEEvent["kind"]>(
  eventType: T,
  listener: EventListener<T>,
  deps?: React.DependencyList,
) => {
  const { addEventListener } = useSSEContext();

  useEffect(() => {
    const removeEventListener = addEventListener(eventType, listener);
    return () => {
      removeEventListener();
    };
  }, [eventType, addEventListener, listener, ...(deps ?? [])]);
};
