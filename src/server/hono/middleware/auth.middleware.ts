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

type PublicApiRoute = {
  path: string;
  methods: ReadonlyArray<string>;
};

// Routes that don't require authentication
const PUBLIC_API_ROUTES: ReadonlyArray<PublicApiRoute> = [
  { path: "/api/auth/login", methods: ["POST"] },
  { path: "/api/auth/check", methods: ["GET"] },
  { path: "/api/auth/logout", methods: ["POST"] },
  { path: "/api/config", methods: ["GET"] }, // Allow config access for theme/locale loading
  { path: "/api/version", methods: ["GET"] },
];

const isPublicApiRoute = (path: string, method: string) =>
  PUBLIC_API_ROUTES.some(
    (route) => route.path === path && route.methods.includes(method),
  );

const LayerImpl = Effect.gen(function* () {
  const ccvOptionsService = yield* CcvOptionsService;

  return Effect.gen(function* () {
    const authPassword = yield* ccvOptionsService.getCcvOptions("password");
    const authEnabled = authPassword !== undefined;
    const validSessionToken = generateSessionToken(authPassword);
    const authMiddleware = createMiddleware<HonoContext>(async (c, next) => {
      // Skip auth for public routes
      if (isPublicApiRoute(c.req.path, c.req.method)) {
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
      authPassword,
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
