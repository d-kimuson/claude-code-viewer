import { userConfigSchema } from "./config";

export const parseUserConfig = (configJson: string | undefined) => {
  const parsed = (() => {
    try {
      return userConfigSchema.parse(JSON.parse(configJson ?? "{}"));
    } catch {
      return userConfigSchema.parse({});
    }
  })();

  return parsed;
};
