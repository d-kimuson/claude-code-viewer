import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import type { FC, PropsWithChildren } from "react";
import { i18nMessages } from ".";

for (const { locale, messages } of i18nMessages) {
  i18n.load(locale, messages);
}

i18n.activate("en");

export const LinguiClientProvider: FC<PropsWithChildren> = ({ children }) => {
  return <I18nProvider i18n={i18n}>{children}</I18nProvider>;
};
