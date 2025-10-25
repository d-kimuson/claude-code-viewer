import type { SSEEvent } from "@claude-code-viewer/shared/types/sse";
import { createContext, useContext } from "react";

export type EventListener<T extends SSEEvent["kind"]> = (
  event: Extract<SSEEvent, { kind: T }>,
) => void;

export type SSEContextType = {
  addEventListener: <T extends SSEEvent["kind"]>(
    eventType: T,
    listener: EventListener<T>,
  ) => () => void;
};

export const SSEContext = createContext<SSEContextType | null>(null);

export const useSSEContext = () => {
  const context = useContext(SSEContext);
  if (!context) {
    throw new Error("useSSEContext must be used within SSEProvider");
  }
  return context;
};
