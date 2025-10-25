import { setI18n } from "@lingui/react/server";
import { getI18nInstance } from "./index";
import { LinguiClientProvider } from "./LinguiClientProvider";
import type { SupportedLocale } from "./schema";

export async function LinguiServerProvider(props: {
  locale: SupportedLocale;
  children: React.ReactNode;
}) {
  const { children, locale } = props;

  const i18n = getI18nInstance(locale);
  setI18n(i18n);

  return (
    <LinguiClientProvider
      initialLocale={locale}
      initialMessages={i18n.messages}
    >
      {children}
    </LinguiClientProvider>
  );
}
