import { Context, Effect, Layer, Runtime } from "effect";
import { getCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import { CcvOptionsService } from "../../core/platform/services/CcvOptionsService";
import type { InferEffect } from "../../lib/effect/types";
import type { HonoContext } from "../app";

// Session token is a simple hash of the password
const generateSessionToken = (password: string | undefined): string => {
  if (!password) return "";
  return Buffer.from(`ccv-session:${password}`).toString("base64");
};

const createAuthRequiredMiddleware = (
  authEnabled: boolean,
  validSessionToken: string,
) => {
  return createMiddleware<HonoContext>(async (c, next) => {
    // Skip auth for non-API routes (let frontend handle auth state)
    if (!c.req.path.startsWith("/api")) {
      return next();
    }

    // Skip auth check if authentication is not enabled
    if (!authEnabled) {
      return next();
    }

    const sessionToken = getCookie(c, "ccv-session");

    if (!sessionToken || sessionToken !== validSessionToken) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    await next();
  });
};

const LayerImpl = Effect.gen(function* () {
  const ccvOptionsService = yield* CcvOptionsService;
  const runtime = yield* Effect.runtime<CcvOptionsService>();
  const runPromise = Runtime.runPromise(runtime);

  return yield* Effect.gen(function* () {
    const getAuthState = Effect.gen(function* () {
      const authPassword = yield* ccvOptionsService.getCcvOptions("password");
      const authEnabled = authPassword !== undefined;
      const validSessionToken = generateSessionToken(authPassword);
      return { authEnabled, authPassword, validSessionToken };
    });

    const authRequiredMiddleware = createMiddleware<HonoContext>(
      async (c, next) => {
        if (!c.req.path.startsWith("/api")) {
          return next();
        }

        const { authEnabled, validSessionToken } =
          await runPromise(getAuthState);

        return createAuthRequiredMiddleware(authEnabled, validSessionToken)(
          c,
          next,
        );
      },
    );

    return {
      getAuthState,
      authRequiredMiddleware,
    };
  });
});

export type IAuthMiddleware = InferEffect<typeof LayerImpl>;
export class AuthMiddleware extends Context.Tag("AuthMiddleware")<
  AuthMiddleware,
  IAuthMiddleware
>() {
  static Live = Layer.effect(this, LayerImpl);
}
