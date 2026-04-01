import { Effect, Runtime } from "effect";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { TypeSafeSSE } from "../../core/events/functions/typeSafeSSE.ts";
import { SSEController } from "../../core/events/presentation/SSEController.ts";
import type { HonoContext } from "../app.ts";
import { getHonoRuntime } from "../runtime.ts";

const sseRoutes = Effect.gen(function* () {
  const sseController = yield* SSEController;
  const runtime = yield* getHonoRuntime;

  return new Hono<HonoContext>().get("/", (c) => {
    return streamSSE(
      c,
      async (rawStream) => {
        await Runtime.runPromise(runtime)(
          sseController.handleSSE(rawStream).pipe(Effect.provide(TypeSafeSSE.make(rawStream))),
        );
      },
      // oxlint-disable-next-line typescript/require-await -- streamSSE error callback requires Promise<void> return type
      async (err) => {
        console.error("Streaming error:", err);
      },
    );
  });
});

export { sseRoutes };
