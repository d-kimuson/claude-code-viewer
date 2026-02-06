import type { FC, ReactNode } from "react";
import { useCallback, useState } from "react";
import { LayoutPanelsContext } from "../../hooks/useLayoutPanels";

interface LayoutPanelsProviderProps {
  children: ReactNode;
}

export const LayoutPanelsProvider: FC<LayoutPanelsProviderProps> = ({
  children,
}) => {
  // Left sidebar state - defaults to open on desktop
  const [isLeftPanelOpen, setIsLeftPanelOpenInternal] = useState(true);
  const [leftPanelWidth, setLeftPanelWidthInternal] = useState(20); // 20% default

  // Bottom panel state - defaults to closed
  const [isBottomPanelOpen, setIsBottomPanelOpenInternal] = useState(false);
  const [bottomPanelHeight, setBottomPanelHeightInternal] = useState(25); // 25% default

  const setIsLeftPanelOpen = useCallback((open: boolean) => {
    setIsLeftPanelOpenInternal(open);
  }, []);

  const toggleLeftPanel = useCallback(() => {
    setIsLeftPanelOpenInternal((prev) => !prev);
  }, []);

  const setLeftPanelWidth = useCallback((width: number) => {
    // Clamp between 15% and 40%
    setLeftPanelWidthInternal(Math.max(15, Math.min(40, width)));
  }, []);

  const setIsBottomPanelOpen = useCallback((open: boolean) => {
    setIsBottomPanelOpenInternal(open);
  }, []);

  const setBottomPanelHeight = useCallback((height: number) => {
    // Clamp between 15% and 50%
    setBottomPanelHeightInternal(Math.max(15, Math.min(50, height)));
  }, []);

  const value = {
    isLeftPanelOpen,
    leftPanelWidth,
    setIsLeftPanelOpen,
    toggleLeftPanel,
    setLeftPanelWidth,
    isBottomPanelOpen,
    bottomPanelHeight,
    setIsBottomPanelOpen,
    setBottomPanelHeight,
  };

  return (
    <LayoutPanelsContext.Provider value={value}>
      {children}
    </LayoutPanelsContext.Provider>
  );
};
