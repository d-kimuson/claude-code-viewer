import type { FC, ReactNode } from "react";

interface LayoutPanelsProviderProps {
  children: ReactNode;
}

export const LayoutPanelsProvider: FC<LayoutPanelsProviderProps> = ({
  children,
}) => {
  return <>{children}</>;
};
