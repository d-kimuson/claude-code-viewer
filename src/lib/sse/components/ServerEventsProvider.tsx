import { useQueryClient } from "@tanstack/react-query";
import { useAtom } from "jotai";
import { type FC, type PropsWithChildren, useCallback, useEffect, useRef } from "react";
import type { SSEEvent } from "../../../types/sse";
import { projectListQuery, sessionProcessesQuery } from "../../../web/lib/api/queries";
import { callSSE } from "../callSSE";
import { type EventListener, SSEContext, type SSEContextType } from "../SSEContext";
import { sseAtom } from "../store/sseAtom";

export const ServerEventsProvider: FC<PropsWithChildren> = ({ children }) => {
  const sseRef = useRef<ReturnType<typeof callSSE> | null>(null);
  const listenersRef = useRef<Map<SSEEvent["kind"], Set<(event: SSEEvent) => void>>>(new Map());
  const [, setSSEState] = useAtom(sseAtom);
  const queryClient = useQueryClient();

  useEffect(() => {
    const sse = callSSE({
      onOpen: () => {
        // reconnect 中のイベントは購読できないので
        // open 時にまとめて invalidate する
        void queryClient.invalidateQueries({
          queryKey: projectListQuery.queryKey,
        });
        // Also invalidate session detail queries to ensure current session is refreshed
        // Pattern: ["projects", projectId, "sessions", sessionId]
        void queryClient.invalidateQueries({
          predicate: (query) => {
            const key = query.queryKey;
            return Array.isArray(key) && key[0] === "projects" && key[2] === "sessions";
          },
        });
        // Invalidate session processes to pick up any status changes missed during reconnection
        void queryClient.invalidateQueries({
          queryKey: sessionProcessesQuery.queryKey,
        });
      },
    });
    sseRef.current = sse;

    const { removeEventListener } = sse.addEventListener("connect", (event) => {
      setSSEState({
        isConnected: true,
      });

      console.log("SSE connected", event);
    });

    return () => {
      // clean up
      sse.cleanUp();
      removeEventListener();
      // Reset ref so that during StrictMode re-mount, children correctly
      // defer listener registration via setTimeout instead of registering
      // on the now-closed EventSource.
      sseRef.current = null;
    };
  }, [setSSEState, queryClient]);

  const addEventListener = useCallback(
    <T extends SSEEvent["kind"]>(eventType: T, listener: EventListener<T>) => {
      // Store the listener in our internal map
      if (!listenersRef.current.has(eventType)) {
        listenersRef.current.set(eventType, new Set());
      }
      const listeners = listenersRef.current.get(eventType);
      if (listeners) {
        // oxlint-disable-next-line no-unsafe-type-assertion -- SSE event listener map requires type widening for storage
        listeners.add(listener as (event: SSEEvent) => void);
      }

      // Register with the actual SSE connection
      let sseCleanup: (() => void) | null = null;
      let timeoutId: NodeJS.Timeout | null = null;

      const registerWithSSE = () => {
        if (sseRef.current) {
          const { removeEventListener } = sseRef.current.addEventListener(eventType, (event) => {
            // oxlint-disable-next-line no-unsafe-type-assertion -- SSE event narrowing requires type assertion
            listener(event as unknown as Extract<SSEEvent, { kind: T }>);
          });
          sseCleanup = removeEventListener;
        }
      };

      // Register immediately if SSE is ready, or wait for it
      if (sseRef.current) {
        registerWithSSE();
      } else {
        // Use a small delay to wait for SSE to be initialized
        timeoutId = setTimeout(registerWithSSE, 0);
      }

      // Return cleanup function
      return () => {
        // Remove from internal listeners
        const listeners = listenersRef.current.get(eventType);
        if (listeners) {
          // oxlint-disable-next-line no-unsafe-type-assertion -- SSE event listener map requires type widening for removal
          listeners.delete(listener as (event: SSEEvent) => void);
          if (listeners.size === 0) {
            listenersRef.current.delete(eventType);
          }
        }
        // Remove from SSE connection
        if (sseCleanup) {
          sseCleanup();
        }
        // Clear timeout if it exists
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      };
    },
    [],
  );

  const contextValue: SSEContextType = {
    addEventListener,
  };

  return <SSEContext.Provider value={contextValue}>{children}</SSEContext.Provider>;
};
