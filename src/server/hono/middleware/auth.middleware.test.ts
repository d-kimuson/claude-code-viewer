import { describe, it } from "@effect/vitest";
import { Effect } from "effect";
import { Hono } from "hono";
import { expect } from "vitest";
import { AuthThrottleService } from "../../core/platform/services/AuthThrottleService.ts";
import { CcvOptionsService } from "../../core/platform/services/CcvOptionsService.ts";
import type { HonoContext } from "../app.ts";
import { AuthMiddleware } from "./auth.middleware.ts";

const createTestApp = (password?: string) =>
  Effect.gen(function* () {
    const ccvOptionsService = yield* CcvOptionsService;
    yield* ccvOptionsService.loadCliOptions({
      port: "3000",
      hostname: "localhost",
      password,
    });

    const authState = yield* AuthMiddleware;
    const { validSessionToken } = yield* authState.getAuthState;
    const app = new Hono<HonoContext>();

    app.get("/api/auth/check", (c) => c.json({ ok: true }));
    app.use(authState.authRequiredMiddleware);
    app.get("/api/projects", (c) => c.json({ ok: true }));

    return {
      app,
      validSessionToken,
    };
  });

describe("auth required middleware", () => {
  it.live("blocks protected APIs when password is configured", () =>
    Effect.gen(function* () {
      const { app, validSessionToken } = yield* createTestApp("secret");

      const unauthorized = yield* Effect.promise(() =>
        Promise.resolve(app.request("/api/projects")),
      );
      expect(unauthorized.status).toBe(401);

      const authorized = yield* Effect.promise(() =>
        Promise.resolve(
          app.request("/api/projects", {
            headers: {
              Cookie: `ccv-session=${validSessionToken}`,
            },
          }),
        ),
      );
      expect(authorized.status).toBe(200);
    }).pipe(
      Effect.provide(AuthMiddleware.Live),
      Effect.provide(AuthThrottleService.Live),
      Effect.provide(CcvOptionsService.Live),
    ),
  );

  it.live("accepts bearer token authorization when password is configured", () =>
    Effect.gen(function* () {
      const { app } = yield* createTestApp("secret");

      const authorized = yield* Effect.promise(() =>
        Promise.resolve(
          app.request("/api/projects", {
            headers: {
              Authorization: "Bearer secret",
            },
          }),
        ),
      );
      expect(authorized.status).toBe(200);

      const unauthorized = yield* Effect.promise(() =>
        Promise.resolve(
          app.request("/api/projects", {
            headers: {
              Authorization: "Bearer wrong",
            },
          }),
        ),
      );
      expect(unauthorized.status).toBe(401);
    }).pipe(
      Effect.provide(AuthMiddleware.Live),
      Effect.provide(AuthThrottleService.Live),
      Effect.provide(CcvOptionsService.Live),
    ),
  );

  it.live("allows access to routes defined before authRequired", () =>
    Effect.gen(function* () {
      const { app } = yield* createTestApp("secret");

      const response = yield* Effect.promise(() => Promise.resolve(app.request("/api/auth/check")));
      expect(response.status).toBe(200);
    }).pipe(
      Effect.provide(AuthMiddleware.Live),
      Effect.provide(AuthThrottleService.Live),
      Effect.provide(CcvOptionsService.Live),
    ),
  );

  it.live("throttles repeated wrong bearer tokens", () =>
    Effect.gen(function* () {
      const { app } = yield* createTestApp("secret");
      const requestWithBearer = (token: string) =>
        Effect.promise(() =>
          Promise.resolve(
            app.request("/api/projects", { headers: { Authorization: `Bearer ${token}` } }),
          ),
        );

      for (let i = 0; i < 5; i++) {
        const response = yield* requestWithBearer("wrong");
        expect(response.status).toBe(401);
      }

      const throttled = yield* requestWithBearer("wrong");
      expect(throttled.status).toBe(429);
      expect(throttled.headers.get("Retry-After")).toBe("1");

      // Even the right password is rejected while locked out
      const lockedOut = yield* requestWithBearer("secret");
      expect(lockedOut.status).toBe(429);
    }).pipe(
      Effect.provide(AuthMiddleware.Live),
      Effect.provide(AuthThrottleService.Live),
      Effect.provide(CcvOptionsService.Live),
    ),
  );

  it.live("does not count cookie failures towards the throttle", () =>
    Effect.gen(function* () {
      const { app } = yield* createTestApp("secret");

      for (let i = 0; i < 6; i++) {
        const response = yield* Effect.promise(() =>
          Promise.resolve(app.request("/api/projects", { headers: { Cookie: "ccv-session=bad" } })),
        );
        expect(response.status).toBe(401);
      }

      const withBearer = yield* Effect.promise(() =>
        Promise.resolve(
          app.request("/api/projects", { headers: { Authorization: "Bearer secret" } }),
        ),
      );
      expect(withBearer.status).toBe(200);
    }).pipe(
      Effect.provide(AuthMiddleware.Live),
      Effect.provide(AuthThrottleService.Live),
      Effect.provide(CcvOptionsService.Live),
    ),
  );

  it.live("allows API access when password is not configured", () =>
    Effect.gen(function* () {
      const { app } = yield* createTestApp(undefined);

      const response = yield* Effect.promise(() => Promise.resolve(app.request("/api/projects")));
      expect(response.status).toBe(200);
    }).pipe(
      Effect.provide(AuthMiddleware.Live),
      Effect.provide(AuthThrottleService.Live),
      Effect.provide(CcvOptionsService.Live),
    ),
  );
});
