import { hc } from "hono/client";
import type { RouteType } from "../../server/hono/route";

export const honoClient = hc<RouteType>(
  typeof window === "undefined"
    ? // biome-ignore lint/complexity/useLiteralKeys: allow here
      // biome-ignore lint/style/noProcessEnv: allow here
      `http://localhost:${process.env["PORT"]}/`
    : "/",
);
