import { useEffect, useRef } from "react";
import type { SSEEvent } from "../../../types/sse";
import { type EventListener, useSSEContext } from "../SSEContext";

/**
 * Custom hook to listen for specific SSE events
 * @param eventType - The type of event to listen for
 * @param listener - The callback function to execute when the event is received
 */
export const useServerEventListener = <T extends SSEEvent["kind"]>(
  eventType: T,
  listener: EventListener<T>,
) => {
  const { addEventListener } = useSSEContext();
  const listenerRef = useRef(listener);

  useEffect(() => {
    listenerRef.current = listener;
  });

  useEffect(() => {
    const removeEventListener = addEventListener(eventType, (event) => {
      listenerRef.current(event);
    });
    return () => {
      removeEventListener();
    };
  }, [eventType, addEventListener]);
};
