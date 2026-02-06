import { createContext, useContext } from "react";

export interface LayoutPanelsContextValue {
  // Left sidebar
  isLeftPanelOpen: boolean;
  leftPanelWidth: number; // percentage
  setIsLeftPanelOpen: (open: boolean) => void;
  toggleLeftPanel: () => void;
  setLeftPanelWidth: (width: number) => void;

  // Bottom panel
  isBottomPanelOpen: boolean;
  bottomPanelHeight: number; // percentage
  setIsBottomPanelOpen: (open: boolean) => void;
  setBottomPanelHeight: (height: number) => void;

  // Right panel is managed by useRightPanel
}

export const LayoutPanelsContext = createContext<
  LayoutPanelsContextValue | undefined
>(undefined);

export const useLayoutPanels = (): LayoutPanelsContextValue => {
  const context = useContext(LayoutPanelsContext);
  if (!context) {
    throw new Error(
      "useLayoutPanels must be used within a LayoutPanelsProvider",
    );
  }
  return context;
};
