import { config } from "dotenv";
import { getCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import type { HonoContext } from "../app";

// Load environment variables - this must happen before accessing process.env
// biome-ignore lint/style/noProcessEnv: allow only here
const isDev = process.env.NODE_ENV === "development";
config({ path: isDev ? ".env.local" : ".env" });

// Simple authentication using a password from environment variable
// Set CCV_AUTH_PASSWORD in .env.local (development) or .env (production)
// biome-ignore lint/style/noProcessEnv: allow only here
const AUTH_PASSWORD = process.env.CCV_AUTH_PASSWORD;

if (!AUTH_PASSWORD) {
  console.error(
    "⚠️  CCV_AUTH_PASSWORD environment variable is not set. Authentication will fail.",
  );
  console.error(
    "   Please set CCV_AUTH_PASSWORD in .env.local (development) or .env (production)",
  );
}

// Session token is a simple hash of the password
const generateSessionToken = (password: string | undefined): string => {
  if (!password) return "";
  return Buffer.from(`ccv-session:${password}`).toString("base64");
};

export const VALID_SESSION_TOKEN = generateSessionToken(AUTH_PASSWORD);

// Routes that don't require authentication
const PUBLIC_API_ROUTES = [
  "/api/auth/login",
  "/api/auth/check",
  "/api/auth/logout",
  "/api/config", // Allow config access for theme/locale loading
  "/api/version",
];

export const authMiddleware = createMiddleware<HonoContext>(async (c, next) => {
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

export { AUTH_PASSWORD };
