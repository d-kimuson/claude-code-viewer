import type { SSEStreamingApi } from "hono/streaming";
import { ulid } from "ulid";
import type { SSEEventDeclaration } from "../../../types/sse";

export const writeTypeSafeSSE = (stream: SSEStreamingApi) => ({
  writeSSE: async <EventName extends keyof SSEEventDeclaration>(
    event: EventName,
    data: SSEEventDeclaration[EventName],
  ): Promise<void> => {
    const id = ulid();
    await stream.writeSSE({
      event: event,
      id: id,
      data: JSON.stringify({
        kind: event,
        timestamp: new Date().toISOString(),
        ...data,
      }),
    });
  },
});
