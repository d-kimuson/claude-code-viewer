import { Effect, Runtime } from "effect";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { TypeSafeSSE } from "../../core/events/functions/typeSafeSSE";
import { SSEController } from "../../core/events/presentation/SSEController";
import type { HonoContext } from "../app";
import { getHonoRuntime } from "../runtime";

const sseRoutes = Effect.gen(function* () {
  const sseController = yield* SSEController;
  const runtime = yield* getHonoRuntime;

  return new Hono<HonoContext>().get("/sse", async (c) => {
    return streamSSE(
      c,
      async (rawStream) => {
        await Runtime.runPromise(runtime)(
          sseController
            .handleSSE(rawStream)
            .pipe(Effect.provide(TypeSafeSSE.make(rawStream))),
        );
      },
      async (err) => {
        console.error("Streaming error:", err);
      },
    );
  });
});

export { sseRoutes };
