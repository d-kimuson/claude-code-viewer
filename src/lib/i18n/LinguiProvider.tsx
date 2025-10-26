import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { type FC, type PropsWithChildren, useEffect } from "react";
import { useConfig } from "../../app/hooks/useConfig";
import { i18nMessages } from ".";

for (const { locale, messages } of i18nMessages) {
  i18n.load(locale, messages);
}

export const LinguiClientProvider: FC<PropsWithChildren> = ({ children }) => {
  const { config } = useConfig();

  useEffect(() => {
    i18n.activate(config.locale);
  }, [config.locale]);

  return <I18nProvider i18n={i18n}>{children}</I18nProvider>;
};
