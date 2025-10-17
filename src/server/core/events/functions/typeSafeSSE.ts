import { Context, Effect, Layer } from "effect";
import type { SSEStreamingApi } from "hono/streaming";
import { ulid } from "ulid";
import type { SSEEventDeclaration } from "../../../../types/sse";

interface TypeSafeSSEService {
  readonly writeSSE: <EventName extends keyof SSEEventDeclaration>(
    event: EventName,
    data: SSEEventDeclaration[EventName],
  ) => Effect.Effect<void, Error>;
}

export class TypeSafeSSE extends Context.Tag("TypeSafeSSE")<
  TypeSafeSSE,
  TypeSafeSSEService
>() {
  static make = (stream: SSEStreamingApi) =>
    Layer.succeed(this, {
      writeSSE: <EventName extends keyof SSEEventDeclaration>(
        event: EventName,
        data: SSEEventDeclaration[EventName],
      ): Effect.Effect<void, Error> =>
        Effect.tryPromise({
          try: async () => {
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
          catch: (error) => {
            if (error instanceof Error) {
              return error;
            }
            return new Error(String(error));
          },
        }),
    } satisfies TypeSafeSSEService);
}
