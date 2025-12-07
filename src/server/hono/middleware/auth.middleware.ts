import { getCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import type { HonoContext } from "../app";
import { EnvService } from "../../core/platform/services/EnvService";
import { Context, Effect, Layer } from "effect";
import type { InferEffect } from "../../lib/effect/types";

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
  const envService = yield* EnvService;

  const AUTH_PASSWORD = yield* envService.getEnv(
    "CLAUDE_CODE_VIEWER_AUTH_PASSWORD",
  );

  if (!AUTH_PASSWORD) {
    console.error(
      "⚠️  CLAUDE_CODE_VIEWER_AUTH_PASSWORD environment variable is not set. Authentication will fail.",
    );
    console.error(
      "   Please set CLAUDE_CODE_VIEWER_AUTH_PASSWORD in .env.local (development) or .env (production)",
    );
  }

  const VALID_SESSION_TOKEN = generateSessionToken(AUTH_PASSWORD);

  const authMiddleware = createMiddleware<HonoContext>(async (c, next) => {
    // Skip auth for public routes
    if (PUBLIC_API_ROUTES.includes(c.req.path)) {
      return next();
    }

    // Skip auth for non-API routes (let frontend handle auth state)
    if (!c.req.path.startsWith("/api")) {
      return next();
    }

    const sessionToken = getCookie(c, "ccv-session");

    if (!sessionToken || sessionToken !== VALID_SESSION_TOKEN) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    await next();
  });

  return {
    AUTH_PASSWORD,
    VALID_SESSION_TOKEN,
    authMiddleware,
  };
});

export type IAuthMiddleware = InferEffect<typeof LayerImpl>;
export class AuthMiddleware extends Context.Tag("AuthMiddleware")<
  AuthMiddleware,
  IAuthMiddleware
>() {
  static Live = Layer.effect(this, LayerImpl);
}
