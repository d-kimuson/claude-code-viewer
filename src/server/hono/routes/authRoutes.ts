import { timingSafeEqual } from "node:crypto";
import { zValidator } from "@hono/zod-validator";
import { Effect } from "effect";
import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { z } from "zod";
import type { HonoContext } from "../app.ts";
import { AuthMiddleware } from "../middleware/auth.middleware.ts";

/**
 * Compare two strings in constant time to prevent timing attacks.
 * Returns false immediately if lengths differ (length is already leaked by nature).
 */
const safeEqual = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, "utf-8"), Buffer.from(b, "utf-8"));
};

const authRoutes = Effect.gen(function* () {
  const { getAuthState } = yield* AuthMiddleware;
  const { validSessionToken, authEnabled, authPassword } = yield* getAuthState;

  return new Hono<HonoContext>()
    .post("/login", zValidator("json", z.object({ password: z.string() })), (c) => {
      const { password } = c.req.valid("json");

      // Check if auth is configured
      if (!authEnabled) {
        return c.json(
          {
            error:
              "Authentication not configured. Set CLAUDE_CODE_VIEWER_AUTH_PASSWORD environment variable.",
          },
          500,
        );
      }

      if (authPassword === undefined || !safeEqual(password, authPassword)) {
        return c.json({ error: "Invalid password" }, 401);
      }

      setCookie(c, "ccv-session", validSessionToken, {
        httpOnly: true,
        secure: false, // Set to true in production with HTTPS
        sameSite: "Lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });

      return c.json({ success: true });
    })

    .post("/logout", (c) => {
      deleteCookie(c, "ccv-session", { path: "/" });
      return c.json({ success: true });
    })

    .get("/check", (c) => {
      const sessionToken = getCookie(c, "ccv-session");
      const isAuthenticated = authEnabled
        ? sessionToken !== undefined &&
          validSessionToken !== "" &&
          safeEqual(sessionToken, validSessionToken)
        : true;
      return c.json({ authenticated: isAuthenticated, authEnabled });
    });
});

export { authRoutes };
