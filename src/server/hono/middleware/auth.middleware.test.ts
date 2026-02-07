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
    const app = new Hono<HonoContext>();

    app.use(authState.authMiddleware);

    app.get("/api/projects", (c) => c.json({ ok: true }));
    app.get("/api/config", (c) => c.json({ ok: true }));
    app.put("/api/config", (c) => c.json({ ok: true }));

    return {
      app,
      validSessionToken: authState.validSessionToken,
    };
  });

describe("auth middleware", () => {
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

  it("allows public config GET but blocks config updates without auth", async () => {
    const { app } = await Effect.runPromise(
      createTestApp("secret").pipe(
        Effect.provide(AuthMiddleware.Live),
        Effect.provide(CcvOptionsService.Live),
      ),
    );

    const configGet = await app.request("/api/config");
    expect(configGet.status).toBe(200);

    const configUpdate = await app.request("/api/config", { method: "PUT" });
    expect(configUpdate.status).toBe(401);
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
