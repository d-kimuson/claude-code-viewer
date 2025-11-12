import { describe, expect, it } from "vitest";
import {
  DEFAULT_LOCALE,
  detectLocaleFromAcceptLanguage,
  detectLocaleFromNavigator,
  resolvePreferredLocale,
} from "./localeDetection";
import type { SupportedLocale } from "./schema";

describe("localeDetection", () => {
  describe("detectLocaleFromAcceptLanguage", () => {
    it("returns zh_CN when Chinese is preferred", () => {
      expect(
        detectLocaleFromAcceptLanguage("zh-CN,zh;q=0.9,en-US;q=0.8"),
      ).toBe<SupportedLocale>("zh_CN");
    });

    it("honors quality values", () => {
      expect(
        detectLocaleFromAcceptLanguage("ja-JP;q=0.8,en-US;q=0.9"),
      ).toBe<SupportedLocale>("en");
    });

    it("returns undefined when header is missing", () => {
      expect(detectLocaleFromAcceptLanguage(undefined)).toBeUndefined();
    });
  });

  describe("detectLocaleFromNavigator", () => {
    it("returns first supported navigator language", () => {
      expect(
        detectLocaleFromNavigator({
          languages: ["ja-JP", "en-US"],
          language: "en-US",
        }),
      ).toBe<SupportedLocale>("ja");
    });

    it("falls back to navigator.language when languages list is empty", () => {
      expect(
        detectLocaleFromNavigator({
          languages: [],
          language: "en-US",
        }),
      ).toBe<SupportedLocale>("en");
    });
  });

  describe("resolvePreferredLocale", () => {
    it("prioritizes accept-language header", () => {
      expect(
        resolvePreferredLocale({
          acceptLanguageHeader: "ja-JP,zh-CN;q=0.8",
          navigator: {
            languages: ["en-US"],
            language: "en-US",
          },
        }),
      ).toBe<SupportedLocale>("ja");
    });

    it("falls back to navigator or default locale", () => {
      expect(
        resolvePreferredLocale({
          acceptLanguageHeader: "es-MX,fr-FR;q=0.7",
          navigator: {
            languages: ["zh-TW", "en-GB"],
            language: "en-GB",
          },
        }),
      ).toBe<SupportedLocale>("zh_CN");

      expect(
        resolvePreferredLocale({
          acceptLanguageHeader: undefined,
          navigator: { languages: [], language: "" },
        }),
      ).toBe<SupportedLocale>(DEFAULT_LOCALE);
    });
  });
});
