import { describe, it } from "@effect/vitest";
import { Effect } from "effect";
import { Hono } from "hono";
import { expect } from "vitest";
import { AuthThrottleService } from "../../core/platform/services/AuthThrottleService.ts";
import { CcvOptionsService } from "../../core/platform/services/CcvOptionsService.ts";
import type { HonoContext } from "../app.ts";
import { AuthMiddleware } from "../middleware/auth.middleware.ts";
import { authRoutes } from "./authRoutes.ts";

const createTestApp = Effect.gen(function* () {
  const ccvOptionsService = yield* CcvOptionsService;
  yield* ccvOptionsService.loadCliOptions({
    port: "3000",
    hostname: "localhost",
    password: "secret",
  });

  const app = new Hono<HonoContext>().route("/api/auth", yield* authRoutes);

  const login = (password: string) =>
    Effect.promise(() =>
      Promise.resolve(
        app.request("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        }),
      ),
    );

  return { login };
});

const provideLayers = <A, E>(
  effect: Effect.Effect<A, E, AuthMiddleware | AuthThrottleService | CcvOptionsService>,
) =>
  effect.pipe(
    Effect.provide(AuthMiddleware.Live),
    Effect.provide(AuthThrottleService.Live),
    Effect.provide(CcvOptionsService.Live),
  );

describe("POST /api/auth/login throttling", () => {
  it.live("rejects with 429 after repeated wrong passwords", () =>
    provideLayers(
      Effect.gen(function* () {
        const { login } = yield* createTestApp;

        for (let i = 0; i < 5; i++) {
          const response = yield* login("wrong");
          expect(response.status).toBe(401);
        }

        const throttled = yield* login("wrong");
        expect(throttled.status).toBe(429);
        expect(throttled.headers.get("Retry-After")).toBe("1");
      }),
    ),
  );

  it.live("rejects the right password while locked out", () =>
    provideLayers(
      Effect.gen(function* () {
        const { login } = yield* createTestApp;

        for (let i = 0; i < 5; i++) {
          yield* login("wrong");
        }

        const lockedOut = yield* login("secret");
        expect(lockedOut.status).toBe(429);
      }),
    ),
  );

  it.live("resets the failure count after a successful login", () =>
    provideLayers(
      Effect.gen(function* () {
        const { login } = yield* createTestApp;

        for (let i = 0; i < 4; i++) {
          yield* login("wrong");
        }
        const success = yield* login("secret");
        expect(success.status).toBe(200);

        for (let i = 0; i < 4; i++) {
          yield* login("wrong");
        }
        const stillNotLocked = yield* login("wrong");
        expect(stillNotLocked.status).toBe(401);
      }),
    ),
  );
});
