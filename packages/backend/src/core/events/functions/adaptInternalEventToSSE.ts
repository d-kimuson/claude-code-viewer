import type { SSEStreamingApi } from "hono/streaming";

export const adaptInternalEventToSSE = (
  rawStream: SSEStreamingApi,
  options?: {
    timeout?: number;
    cleanUp?: () => void | Promise<void>;
  },
) => {
  const { timeout = 60 * 1000, cleanUp } = options ?? {};

  const abortController = new AbortController();
  let connectionResolve: (() => void) | undefined;
  const connectionPromise = new Promise<void>((resolve) => {
    connectionResolve = resolve;
  });

  const closeConnection = () => {
    connectionResolve?.();
    abortController.abort();
    cleanUp?.();
  };

  rawStream.onAbort(() => {
    closeConnection();
  });

  setTimeout(() => {
    closeConnection();
  }, timeout);

  return {
    connectionPromise,
  } as const;
};
