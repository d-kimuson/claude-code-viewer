import { defineConfig } from "@lingui/conf";
import { formatter } from "@lingui/format-json";
import type { SupportedLocale } from "./src/lib/i18n/schema";

const config = defineConfig({
  locales: ["ja", "en"] satisfies SupportedLocale[],
  sourceLocale: "en",
  fallbackLocales: {
    default: "en",
  },
  catalogs: [
    {
      path: "src/lib/i18n/locales/{locale}/messages",
      include: ["src"],
    },
  ],
  format: formatter({ style: "lingui" }),
});

export default config;
