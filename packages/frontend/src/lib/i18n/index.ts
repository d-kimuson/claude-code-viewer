import "server-only";

import { type I18n, type Messages, setupI18n } from "@lingui/core";
import type { SupportedLocale } from "./schema";

const locales: SupportedLocale[] = ["ja", "en"];

async function loadCatalog(locale: SupportedLocale): Promise<{
  [k: string]: Messages;
}> {
  const { messages } = await import(`./locales/${locale}/messages`);
  return {
    [locale]: messages,
  };
}
const catalogs = await Promise.all(locales.map(loadCatalog));

export const allMessages = catalogs.reduce((acc, oneCatalog) => {
  // biome-ignore lint/performance/noAccumulatingSpread: size is small
  return { ...acc, ...oneCatalog };
}, {});

type AllI18nInstances = { [K in SupportedLocale]: I18n };

export const allI18nInstances = locales.reduce(
  (acc: Partial<AllI18nInstances>, locale) => {
    const messages = allMessages[locale] ?? {};
    const i18n = setupI18n({
      locale,
      messages: { [locale]: messages },
    });
    // biome-ignore lint/performance/noAccumulatingSpread: size is small
    return { ...acc, [locale]: i18n };
  },
  {},
) as AllI18nInstances;

export const getI18nInstance = (locale: SupportedLocale): I18n => {
  if (!allI18nInstances[locale]) {
    console.warn(`No i18n instance found for locale "${locale}"`);
  }

  const instance = allI18nInstances[locale] ?? allI18nInstances.en;

  if (instance === undefined) {
    throw new Error(`No i18n instance found for locale "${locale}"`);
  }

  return instance;
};
