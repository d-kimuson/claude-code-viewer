import { Effect } from "effect";
import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { CcvOptionsService } from "../../core/platform/services/CcvOptionsService";
import type { HonoContext } from "../app";
import { AuthMiddleware } from "./auth.middleware";

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
  it("blocks protected APIs when password is configured", async () => {
    const { app, validSessionToken } = await Effect.runPromise(
      createTestApp("secret").pipe(
        Effect.provide(AuthMiddleware.Live),
        Effect.provide(CcvOptionsService.Live),
      ),
    );

    const unauthorized = await app.request("/api/projects");
    expect(unauthorized.status).toBe(401);

    const authorized = await app.request("/api/projects", {
      headers: {
        Cookie: `ccv-session=${validSessionToken}`,
      },
    });
    expect(authorized.status).toBe(200);
  });

  it("allows access to routes defined before authRequired", async () => {
    const { app } = await Effect.runPromise(
      createTestApp("secret").pipe(
        Effect.provide(AuthMiddleware.Live),
        Effect.provide(CcvOptionsService.Live),
      ),
    );

    const response = await app.request("/api/auth/check");
    expect(response.status).toBe(200);
  });

  it("allows API access when password is not configured", async () => {
    const { app } = await Effect.runPromise(
      createTestApp(undefined).pipe(
        Effect.provide(AuthMiddleware.Live),
        Effect.provide(CcvOptionsService.Live),
      ),
    );

    const response = await app.request("/api/projects");
    expect(response.status).toBe(200);
  });
});
