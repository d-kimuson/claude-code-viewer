import { Context, Effect, Layer } from "effect";
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

// Routes that don't require authentication
const PUBLIC_API_ROUTES = [
  "/api/auth/login",
  "/api/auth/check",
  "/api/auth/logout",
  "/api/config", // Allow config access for theme/locale loading
  "/api/version",
];

const LayerImpl = Effect.gen(function* () {
  const ccvOptionsService = yield* CcvOptionsService;

  return Effect.gen(function* () {
    const anthPassword = yield* ccvOptionsService.getCcvOptions("password");
    const authEnabled = anthPassword !== undefined;
    const validSessionToken = generateSessionToken(anthPassword);
    const authMiddleware = createMiddleware<HonoContext>(async (c, next) => {
      // Skip auth for public routes
      if (PUBLIC_API_ROUTES.includes(c.req.path)) {
        return next();
      }

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

    return {
      authEnabled,
      anthPassword,
      validSessionToken,
      authMiddleware,
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
