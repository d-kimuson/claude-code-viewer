import { format } from "date-fns";
import { enUS } from "date-fns/locale/en-US";
import { ja } from "date-fns/locale/ja";
import { zhCN } from "date-fns/locale/zh-CN";
import type { SupportedLocale } from "../i18n/schema";

export const convertDateFnsLocale = (locale: SupportedLocale) => {
  switch (locale) {
    case "ja":
      return ja;
    case "en":
      return enUS;
    case "zh_CN":
      return zhCN;
    default:
      locale satisfies never;
      return enUS;
  }
};

export const formatLocaleDate = (
  date: Date | string | number,
  options: {
    locale?: SupportedLocale;
    target?: "month" | "day" | "time";
  },
) => {
  const { locale = "en", target = "time" } = options;

  const dateObject = typeof date === "string" ? new Date(date) : date;
  const dateFnsLocale = convertDateFnsLocale(locale);

  const getFormatPattern = (
    locale: SupportedLocale,
    target: "month" | "day" | "time",
  ): string => {
    if (locale === "ja") {
      switch (target) {
        case "month":
          return "yyyy年M月";
        case "day":
          return "yyyy年M月d日";
        case "time":
          return "yyyy年M月d日 HH:mm";
      }
    } else if (locale === "en") {
      switch (target) {
        case "month":
          return "MM/yyyy";
        case "day":
          return "MM/dd/yyyy";
        case "time":
          return "MM/dd/yyyy HH:mm";
      }
    } else if (locale === "zh_CN") {
      switch (target) {
        case "month":
          return "yyyy年M月";
        case "day":
          return "yyyy年M月d日";
        case "time":
          return "yyyy年M月d日 HH:mm";
      }
    }
    // default
    switch (target) {
      case "month":
        return "yyyy-MM";
      case "day":
        return "yyyy-MM-dd";
      case "time":
        return "yyyy-MM-dd HH:mm";
    }
  };

  const formatPattern = getFormatPattern(locale, target);
  return format(dateObject, formatPattern, {
    locale: dateFnsLocale,
  });
};
