import type { RefObject } from "react";
import { createContext, useContext } from "react";

export type RightPanelTab = "git" | "files-tools" | "review" | "browser";

interface RightPanelContextValue {
  isOpen: boolean;
  activeTab: RightPanelTab;
  width: number; // percentage
  openPanel: (tab?: RightPanelTab) => void;
  closePanel: () => void;
  togglePanel: () => void;
  setActiveTab: (tab: RightPanelTab) => void;
  setWidth: (width: number) => void;
  // Browser-specific state and methods
  browserUrl: string | null;
  inputUrl: string;
  setInputUrl: (url: string) => void;
  openBrowser: (url: string) => void;
  closeBrowser: () => void;
  reloadBrowser: () => void;
  handleUrlSubmit: () => void;
  iframeRef: RefObject<HTMLIFrameElement | null>;
  // Todo section state
  isTodoSectionOpen: boolean;
  setIsTodoSectionOpen: (isOpen: boolean) => void;
}

export const RightPanelContext = createContext<
  RightPanelContextValue | undefined
>(undefined);

export const useRightPanel = (): RightPanelContextValue => {
  const context = useContext(RightPanelContext);
  if (!context) {
    throw new Error("useRightPanel must be used within a RightPanelProvider");
  }
  return context;
};
