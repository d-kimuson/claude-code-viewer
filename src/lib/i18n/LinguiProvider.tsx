import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { type FC, type PropsWithChildren, useEffect } from "react";
import { useConfig } from "../../app/hooks/useConfig";
import { activateLocale } from ".";

export const LinguiClientProvider: FC<PropsWithChildren> = ({ children }) => {
  const { config } = useConfig();

  useEffect(() => {
    void activateLocale(config.locale);
  }, [config.locale]);

  return <I18nProvider i18n={i18n}>{children}</I18nProvider>;
};
