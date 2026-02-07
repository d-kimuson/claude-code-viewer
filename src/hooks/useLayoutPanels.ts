import { useAtomValue, useSetAtom, useStore } from "jotai";
import { useCallback } from "react";
import {
  bottomPanelHeightAtom,
  bottomPanelOpenAtom,
  leftPanelOpenAtom,
  leftPanelWidthAtom,
} from "@/lib/atoms/layoutPanels";

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

const clampValue = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const useLeftPanelState = () => {
  const isLeftPanelOpen = useAtomValue(leftPanelOpenAtom);
  const leftPanelWidth = useAtomValue(leftPanelWidthAtom);
  return { isLeftPanelOpen, leftPanelWidth };
};

export const useLeftPanelActions = () => {
  const store = useStore();
  const setIsLeftPanelOpen = useSetAtom(leftPanelOpenAtom);
  const setLeftPanelWidth = useSetAtom(leftPanelWidthAtom);

  const toggleLeftPanel = useCallback(() => {
    const current = store.get(leftPanelOpenAtom);
    setIsLeftPanelOpen(!current);
  }, [setIsLeftPanelOpen, store]);

  const setLeftPanelWidthClamped = useCallback(
    (width: number) => {
      const clamped = clampValue(width, 15, 40);
      setLeftPanelWidth(clamped);
    },
    [setLeftPanelWidth],
  );

  return {
    setIsLeftPanelOpen,
    toggleLeftPanel,
    setLeftPanelWidth: setLeftPanelWidthClamped,
  };
};

export const useBottomPanelState = () => {
  const isBottomPanelOpen = useAtomValue(bottomPanelOpenAtom);
  const bottomPanelHeight = useAtomValue(bottomPanelHeightAtom);
  return { isBottomPanelOpen, bottomPanelHeight };
};

export const useBottomPanelActions = () => {
  const setIsBottomPanelOpen = useSetAtom(bottomPanelOpenAtom);
  const setBottomPanelHeight = useSetAtom(bottomPanelHeightAtom);

  const setBottomPanelHeightClamped = useCallback(
    (height: number) => {
      const clamped = clampValue(height, 15, 50);
      setBottomPanelHeight(clamped);
    },
    [setBottomPanelHeight],
  );

  return {
    setIsBottomPanelOpen,
    setBottomPanelHeight: setBottomPanelHeightClamped,
  };
};

export const useLayoutPanels = (): LayoutPanelsContextValue => {
  const { isLeftPanelOpen, leftPanelWidth } = useLeftPanelState();
  const { isBottomPanelOpen, bottomPanelHeight } = useBottomPanelState();
  const { setIsLeftPanelOpen, toggleLeftPanel, setLeftPanelWidth } =
    useLeftPanelActions();
  const { setIsBottomPanelOpen, setBottomPanelHeight } =
    useBottomPanelActions();

  return {
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
};
