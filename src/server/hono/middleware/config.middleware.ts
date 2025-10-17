import { getCookie, setCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import { configSchema } from "../../lib/config/config";
import type { HonoContext } from "../app";

export const configMiddleware = createMiddleware<HonoContext>(
  async (c, next) => {
    const cookie = getCookie(c, "ccv-config");
    const parsed = (() => {
      try {
        return configSchema.parse(JSON.parse(cookie ?? "{}"));
      } catch {
        return configSchema.parse({});
      }
    })();

    if (cookie === undefined) {
      setCookie(
        c,
        "ccv-config",
        JSON.stringify({
          hideNoUserMessageSession: true,
          unifySameTitleSession: true,
        }),
      );
    }

    c.set("config", parsed);

    await next();
  },
);
