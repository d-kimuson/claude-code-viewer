import type { FC, ReactNode } from "react";

type LayoutPanelsProviderProps = {
  children: ReactNode;
};

export const LayoutPanelsProvider: FC<LayoutPanelsProviderProps> = ({ children }) => {
  return <>{children}</>;
};
