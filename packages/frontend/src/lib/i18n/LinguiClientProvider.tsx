import { type Messages, setupI18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { type FC, type PropsWithChildren, useState } from "react";

export const LinguiClientProvider: FC<
  PropsWithChildren<{
    initialLocale: string;
    initialMessages: Messages;
  }>
> = ({ children, initialLocale, initialMessages }) => {
  const [i18n] = useState(() => {
    return setupI18n({
      locale: initialLocale,
      messages: { [initialLocale]: initialMessages },
    });
  });
  return <I18nProvider i18n={i18n}>{children}</I18nProvider>;
};
