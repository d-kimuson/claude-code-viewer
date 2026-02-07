import { zValidator } from "@hono/zod-validator";
import { Effect } from "effect";
import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { z } from "zod";
import type { HonoContext } from "../app";
import { AuthMiddleware } from "../middleware/auth.middleware";

const authRoutes = Effect.gen(function* () {
  const { getAuthState } = yield* AuthMiddleware;
  const { validSessionToken, authEnabled, authPassword } = yield* getAuthState;

  return new Hono<HonoContext>()
    .post(
      "/login",
      zValidator("json", z.object({ password: z.string() })),
      async (c) => {
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

        if (password !== authPassword) {
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
      },
    )

    .post("/logout", async (c) => {
      deleteCookie(c, "ccv-session", { path: "/" });
      return c.json({ success: true });
    })

    .get("/check", async (c) => {
      const sessionToken = getCookie(c, "ccv-session");
      const isAuthenticated = authEnabled
        ? sessionToken === validSessionToken
        : true;
      return c.json({ authenticated: isAuthenticated, authEnabled });
    });
});

export { authRoutes };
