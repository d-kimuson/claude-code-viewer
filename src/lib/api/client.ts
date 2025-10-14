import { hc } from "hono/client";
import type { RouteType } from "../../server/hono/route";
import { env } from "../../server/lib/env";

export const honoClient = hc<RouteType>(
  typeof window === "undefined" ? `http://localhost:${env.get("PORT")}/` : "/",
);
