import { it } from "@effect/vitest";
import { Effect, Either } from "effect";
import { expect } from "vitest";
import { testPlatformLayer } from "../../../testing/layers/testPlatformLayer.ts";
import { TerminalService } from "./TerminalService.ts";

it.live("disables terminal when CCV_TERMINAL_DISABLED is enabled", () =>
  Effect.gen(function* () {
    const terminalService = yield* TerminalService;
    const result = yield* Effect.either(terminalService.getOrCreateSession(undefined));

    expect(Either.isLeft(result)).toBe(true);
  }).pipe(
    Effect.provide(TerminalService.Live),
    Effect.provide(testPlatformLayer({ env: { CCV_TERMINAL_DISABLED: "1" } })),
    Effect.scoped,
  ),
);

it.live("disables terminal when --terminal-disabled is enabled", () =>
  Effect.gen(function* () {
    const terminalService = yield* TerminalService;
    const result = yield* Effect.either(terminalService.getOrCreateSession(undefined));

    expect(Either.isLeft(result)).toBe(true);
  }).pipe(
    Effect.provide(TerminalService.Live),
    Effect.provide(testPlatformLayer({ ccvOptions: { terminalDisabled: true } })),
    Effect.scoped,
  ),
);
