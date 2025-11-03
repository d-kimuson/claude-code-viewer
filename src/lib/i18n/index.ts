import { i18n } from "@lingui/core";
import type { SupportedLocale } from "./schema";

export const locales: SupportedLocale[] = ["ja", "en", "zh_CN"];

const importMessages = async (locale: SupportedLocale) => {
  switch (locale) {
    case "ja":
      return import("./locales/ja/messages");
    case "en":
      return import("./locales/en/messages");
    case "zh_CN":
      return import("./locales/zh_CN/messages");
    default:
      locale satisfies never;
      throw new Error(`Unsupported locale: ${locale}`);
  }
};

const loadedLocales: SupportedLocale[] = [];
export const activateLocale = async (locale: SupportedLocale) => {
  if (!loadedLocales.includes(locale)) {
    const { messages } = await importMessages(locale);
    i18n.load(locale, messages);
    loadedLocales.push(locale);
  }

  i18n.activate(locale);
};
