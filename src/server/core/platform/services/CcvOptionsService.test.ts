import { describe, it } from "@effect/vitest";
import { Effect } from "effect";
import { expect } from "vitest";
import { CcvOptionsService } from "./CcvOptionsService.ts";

describe("CcvOptionsService", () => {
  it.live("returns options before CLI options are loaded", () =>
    Effect.gen(function* () {
      const ccvOptionsService = yield* CcvOptionsService;
      const port = yield* ccvOptionsService.getCcvOptions("port");
      const hostname = yield* ccvOptionsService.getCcvOptions("hostname");

      expect(Number.isFinite(port)).toBe(true);
      expect(hostname.length).toBeGreaterThan(0);
    }).pipe(Effect.provide(CcvOptionsService.Live)),
  );

  it.live("loads verbose option from CLI", () =>
    Effect.gen(function* () {
      const ccvOptionsService = yield* CcvOptionsService;

      yield* ccvOptionsService.loadCliOptions({
        port: "3000",
        hostname: "localhost",
        verbose: true,
      });

      const verbose = yield* ccvOptionsService.getCcvOptions("verbose");
      expect(verbose).toBe(true);
    }).pipe(Effect.provide(CcvOptionsService.Live)),
  );

  it.live("defaults verbose option to undefined", () =>
    Effect.gen(function* () {
      const ccvOptionsService = yield* CcvOptionsService;

      yield* ccvOptionsService.loadCliOptions({
        port: "3000",
        hostname: "localhost",
      });

      const verbose = yield* ccvOptionsService.getCcvOptions("verbose");
      expect(verbose).toBeUndefined();
    }).pipe(Effect.provide(CcvOptionsService.Live)),
  );
});
