import { getCookie, setCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import type { UserConfig } from "../../lib/config/config";
import { parseUserConfig } from "../../lib/config/parseUserConfig";
import type { HonoContext } from "../app";

export const configMiddleware = createMiddleware<HonoContext>(
  async (c, next) => {
    const cookie = getCookie(c, "ccv-config");
    const parsed = parseUserConfig(cookie);

    if (cookie === undefined) {
      setCookie(
        c,
        "ccv-config",
        JSON.stringify({
          hideNoUserMessageSession: true,
          unifySameTitleSession: true,
          enterKeyBehavior: "shift-enter-send",
          permissionMode: "default",
          locale: "ja",
        } satisfies UserConfig),
      );
    }

    c.set("userConfig", parsed);

    await next();
  },
);
