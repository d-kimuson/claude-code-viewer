import type { SupportedLocale } from "./schema";

export const DEFAULT_LOCALE: SupportedLocale = "en";

const normalizeTag = (tag?: string): SupportedLocale | undefined => {
  if (!tag) {
    return undefined;
  }

  const normalized = tag.trim().toLowerCase().replaceAll("_", "-");
  if (normalized.length === 0 || normalized === "*") {
    return undefined;
  }

  if (normalized.startsWith("zh")) {
    return "zh_CN";
  }

  if (normalized.startsWith("ja") || normalized.startsWith("jp")) {
    return "ja";
  }

  if (normalized.startsWith("en")) {
    return "en";
  }

  return undefined;
};

export const detectLocaleFromAcceptLanguage = (
  header: string | undefined,
): SupportedLocale | undefined => {
  if (!header) {
    return undefined;
  }

  const preferences = header
    // Convert the raw Accept-Language header (e.g. "en-US;q=0.8, fr")
    // into a list of { tag, quality, index } entries that we can sort.
    .split(",")
    .map((part, index) => {
      const [rawTag, ...params] = part.trim().split(";");
      const qParam = params
        .map((param) => param.trim())
        .find((param) => param.startsWith("q="));
      const quality = qParam ? Number.parseFloat(qParam.slice(2)) : 1;

      return {
        tag: rawTag,
        quality: Number.isNaN(quality) ? 1 : quality,
        index,
      };
    })
    // Example result for "en-US;q=0.8, fr":
    // [{ tag: "en-US", quality: 0.8, index: 0 }, { tag: "fr", quality: 1, index: 1 }]
    .filter((item) => Boolean(item.tag))
    .sort((a, b) => {
      if (b.quality !== a.quality) {
        return b.quality - a.quality;
      }
      return a.index - b.index;
    });

  for (const preference of preferences) {
    const locale = normalizeTag(preference.tag);
    if (locale) {
      return locale;
    }
  }

  return undefined;
};

type NavigatorLike = Pick<Navigator, "language" | "languages">;

export const detectLocaleFromNavigator = (
  nav?: NavigatorLike,
): SupportedLocale | undefined => {
  if (!nav) {
    return undefined;
  }

  let languages: readonly string[];
  if (nav.languages && nav.languages.length > 0) {
    languages = nav.languages;
  } else if (nav.language) {
    languages = [nav.language];
  } else {
    languages = [];
  }

  for (const language of languages) {
    const locale = normalizeTag(language);
    if (locale) {
      return locale;
    }
  }

  return undefined;
};

export const resolvePreferredLocale = (
  options: { acceptLanguageHeader?: string; navigator?: NavigatorLike } = {},
): SupportedLocale => {
  return (
    detectLocaleFromAcceptLanguage(options.acceptLanguageHeader) ||
    detectLocaleFromNavigator(options.navigator) ||
    DEFAULT_LOCALE
  );
};
