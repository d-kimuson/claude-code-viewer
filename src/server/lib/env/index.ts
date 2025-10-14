import { type EnvSchema, envSchema } from "./schema";

const parseEnv = () => {
  // biome-ignore lint/style/noProcessEnv: allow only here
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error(parsed.error);
    throw new Error(`Invalid environment variables: ${parsed.error.message}`);
  }

  return parsed.data;
};

export const env = (() => {
  let parsedEnv: EnvSchema | undefined;

  return {
    get: <Key extends keyof EnvSchema>(key: Key): EnvSchema[Key] => {
      parsedEnv ??= parseEnv();
      return parsedEnv[key];
    },
  };
})();
