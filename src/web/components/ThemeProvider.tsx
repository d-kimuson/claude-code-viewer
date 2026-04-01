import { type FC, type PropsWithChildren, useEffect } from "react";
import { useTheme } from "../hooks/useTheme";

export const ThemeProvider: FC<PropsWithChildren> = ({ children }) => {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(resolvedTheme);
  }, [resolvedTheme]);

  return <>{children}</>;
};
