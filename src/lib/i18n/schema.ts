import z from "zod";

export const localeSchema = z.enum(["ja", "en", "zh_CN"]);
export type SupportedLocale = z.infer<typeof localeSchema>;
