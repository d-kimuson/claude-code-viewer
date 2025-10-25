import z from "zod";

export const localeSchema = z.enum(["ja", "en"]);
export type SupportedLocale = z.infer<typeof localeSchema>;
