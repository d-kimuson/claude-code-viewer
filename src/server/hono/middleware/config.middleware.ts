import { getCookie, setCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import { userConfigSchema } from "../../lib/config/config";
import type { HonoContext } from "../app";

export const configMiddleware = createMiddleware<HonoContext>(
  async (c, next) => {
    const cookie = getCookie(c, "ccv-config");
    const parsed = (() => {
      try {
        return userConfigSchema.parse(JSON.parse(cookie ?? "{}"));
      } catch {
        return userConfigSchema.parse({});
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

    c.set("userConfig", parsed);

    await next();
  },
);
