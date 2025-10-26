import type { Messages } from "@lingui/core";
import { messages as enMessages } from "./locales/en/messages";
import { messages as jaMessages } from "./locales/ja/messages";
import type { SupportedLocale } from "./schema";

export const locales: SupportedLocale[] = ["ja", "en"];

export const i18nMessages = [
  {
    locale: "ja",
    messages: jaMessages,
  },
  {
    locale: "en",
    messages: enMessages,
  },
] as const satisfies Array<{
  locale: SupportedLocale;
  messages: Messages;
}>;
