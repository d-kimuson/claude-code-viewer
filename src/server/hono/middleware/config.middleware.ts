import { getCookie, setCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import {
  DEFAULT_LOCALE,
  detectLocaleFromAcceptLanguage,
} from "../../../lib/i18n/localeDetection";
import { defaultUserConfig, type UserConfig } from "../../lib/config/config";
import { parseUserConfig } from "../../lib/config/parseUserConfig";
import type { HonoContext } from "../app";

export const configMiddleware = createMiddleware<HonoContext>(
  async (c, next) => {
    const cookie = getCookie(c, "ccv-config");
    const parsed = parseUserConfig(cookie);

    if (cookie === undefined) {
      const preferredLocale =
        detectLocaleFromAcceptLanguage(c.req.header("accept-language")) ??
        DEFAULT_LOCALE;

      setCookie(
        c,
        "ccv-config",
        JSON.stringify({
          ...defaultUserConfig,
          locale: preferredLocale,
        } satisfies UserConfig),
      );
    }

    c.set("userConfig", parsed);

    await next();
  },
);
