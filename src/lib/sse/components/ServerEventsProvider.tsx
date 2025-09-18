import { useQueryClient } from "@tanstack/react-query";
import { useAtom } from "jotai";
import {
  type FC,
  type PropsWithChildren,
  useCallback,
  useEffect,
  useRef,
} from "react";
import type { SSEEvent } from "../../../types/sse";
import { projectListQuery } from "../../api/queries";
import { callSSE } from "../callSSE";
import {
  type EventListener,
  SSEContext,
  type SSEContextType,
} from "../SSEContext";
import { sseAtom } from "../store/sseAtom";

export const ServerEventsProvider: FC<PropsWithChildren> = ({ children }) => {
  const sseRef = useRef<ReturnType<typeof callSSE> | null>(null);
  const listenersRef = useRef<
    Map<SSEEvent["kind"], Set<(event: SSEEvent) => void>>
  >(new Map());
  const [, setSSEState] = useAtom(sseAtom);
  const queryClient = useQueryClient();

  useEffect(() => {
    const sse = callSSE({
      onOpen: async () => {
        // reconnect 中のイベントは購読できないので
        // open 時にまとめて invalidate する
        await queryClient.invalidateQueries({
          queryKey: projectListQuery.queryKey,
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
        listeners.add(listener as (event: SSEEvent) => void);
      }

      // Register with the actual SSE connection
      let sseCleanup: (() => void) | null = null;
      let timeoutId: NodeJS.Timeout | null = null;

      const registerWithSSE = () => {
        if (sseRef.current) {
          const { removeEventListener } = sseRef.current.addEventListener(
            eventType,
            (event) => {
              // The listener expects the specific event type, so we cast it through unknown first
              listener(event as unknown as Extract<SSEEvent, { kind: T }>);
            },
          );
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

  return (
    <SSEContext.Provider value={contextValue}>{children}</SSEContext.Provider>
  );
};
