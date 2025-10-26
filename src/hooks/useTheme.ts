import { useMemo } from "react";
import { useConfig } from "../app/hooks/useConfig";

type ResolvedTheme = "light" | "dark";

export const useTheme = () => {
  const { config } = useConfig();
  const resolvedTheme = useMemo<ResolvedTheme>(() => {
    if (config?.theme === "light" || config?.theme === "dark") {
      return config?.theme;
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }, [config?.theme]);

  return {
    theme: config?.theme ?? "system",
    resolvedTheme,
  };
};
