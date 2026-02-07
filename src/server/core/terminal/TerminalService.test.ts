import { Effect, Either } from "effect";
import { expect, test } from "vitest";
import { testPlatformLayer } from "../../../testing/layers/testPlatformLayer";
import { TerminalService } from "./TerminalService";

test("disables terminal when CCV_TERMINAL_DISABLED is enabled", async () => {
  const program = Effect.gen(function* () {
    const terminalService = yield* TerminalService;
    return yield* Effect.either(terminalService.getOrCreateSession(undefined));
  }).pipe(
    Effect.provide(TerminalService.Live),
    Effect.provide(testPlatformLayer({ env: { CCV_TERMINAL_DISABLED: "1" } })),
    Effect.scoped,
  );

  const result = await Effect.runPromise(program);

  expect(Either.isLeft(result)).toBe(true);
});
