import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import {
  DEFAULT_LOCALE,
  detectLocaleFromAcceptLanguage,
} from "../../../lib/i18n/localeDetection.ts";
import { defaultUserConfig, type UserConfig } from "../../lib/config/config.ts";
import { parseUserConfig } from "../../lib/config/parseUserConfig.ts";
import type { HonoContext } from "../app.ts";

export const createConfigMiddleware = (basePath: string) =>
  createMiddleware<HonoContext>(async (c, next) => {
    const cookie = getCookie(c, "ccv-config");
    const parsed = parseUserConfig(cookie);

    if (cookie === undefined || basePath !== "/") {
      const config =
        cookie === undefined
          ? {
              ...defaultUserConfig,
              locale:
                detectLocaleFromAcceptLanguage(c.req.header("accept-language")) ?? DEFAULT_LOCALE,
            }
          : parsed;

      if (basePath !== "/") {
        deleteCookie(c, "ccv-config", { path: "/" });
      }
      setCookie(c, "ccv-config", JSON.stringify(config satisfies UserConfig), {
        path: basePath,
      });
    }

    c.set("userConfig", parsed);

    await next();
  });
