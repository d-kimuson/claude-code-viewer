import { useAtomValue, useSetAtom, useStore } from "jotai";
import { useCallback } from "react";
import { toast } from "sonner";
import {
  rightPanelActiveTabAtom,
  rightPanelBrowserUrlAtom,
  rightPanelCurrentUrlAtom,
  rightPanelIframeRefAtom,
  rightPanelInputUrlAtom,
  rightPanelOpenAtom,
  rightPanelTodoOpenAtom,
  rightPanelWidthAtom,
} from "@/lib/atoms/rightPanel";
import type { RightPanelTab } from "@/lib/types/rightPanel";

const clampValue = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const isBlockedDomain = (url: string) => {
  try {
    const hostname = new URL(url).hostname;
    const blockedDomains = [
      "github.com",
      "www.github.com",
      "gitlab.com",
      "www.gitlab.com",
      "twitter.com",
      "x.com",
      "facebook.com",
      "linkedin.com",
      "google.com",
      "www.google.com",
    ];
    return blockedDomains.some((domain) => hostname.endsWith(domain));
  } catch {
    return false;
  }
};

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
  setCurrentUrl: (url: string | null) => void;
  openBrowser: (url: string) => void;
  closeBrowser: () => void;
  reloadBrowser: () => void;
  handleUrlSubmit: () => void;
  // Todo section state
  isTodoSectionOpen: boolean;
  setIsTodoSectionOpen: (isOpen: boolean) => void;
}

export const useRightPanelOpen = () => useAtomValue(rightPanelOpenAtom);

export const useRightPanelWidth = () => useAtomValue(rightPanelWidthAtom);

export const useRightPanelState = () => {
  const isOpen = useRightPanelOpen();
  const activeTab = useAtomValue(rightPanelActiveTabAtom);
  const width = useRightPanelWidth();
  const browserUrl = useAtomValue(rightPanelBrowserUrlAtom);
  const inputUrl = useAtomValue(rightPanelInputUrlAtom);
  return { isOpen, activeTab, width, browserUrl, inputUrl };
};

export const useRightPanelTodoState = () =>
  useAtomValue(rightPanelTodoOpenAtom);

export const useRightPanelTodoActions = () => {
  const setIsTodoSectionOpen = useSetAtom(rightPanelTodoOpenAtom);
  return { setIsTodoSectionOpen };
};

export const useRightPanelActions = () => {
  const store = useStore();
  const setIsOpen = useSetAtom(rightPanelOpenAtom);
  const setActiveTab = useSetAtom(rightPanelActiveTabAtom);
  const setWidth = useSetAtom(rightPanelWidthAtom);
  const setBrowserUrl = useSetAtom(rightPanelBrowserUrlAtom);
  const setCurrentUrl = useSetAtom(rightPanelCurrentUrlAtom);
  const setInputUrl = useSetAtom(rightPanelInputUrlAtom);

  const openPanel = useCallback(
    (tab?: RightPanelTab) => {
      setIsOpen(true);
      if (tab) {
        setActiveTab(tab);
      }
    },
    [setIsOpen, setActiveTab],
  );

  const closePanel = useCallback(() => {
    setIsOpen(false);
  }, [setIsOpen]);

  const togglePanel = useCallback(() => {
    const current = store.get(rightPanelOpenAtom);
    setIsOpen(!current);
  }, [setIsOpen, store]);

  const setWidthClamped = useCallback(
    (width: number) => {
      const clamped = clampValue(width, 20, 80);
      setWidth(clamped);
    },
    [setWidth],
  );

  const openBrowser = useCallback(
    (url: string) => {
      if (isBlockedDomain(url)) {
        toast.warning("This website cannot be previewed instantly.", {
          description: "It blocks embedded views. Click to open in a new tab.",
          action: {
            label: "Open Link",
            onClick: () => window.open(url, "_blank"),
          },
          duration: 5000,
        });
        return;
      }
      setBrowserUrl(url);
      setCurrentUrl(url);
      setInputUrl(url);
      setActiveTab("browser");
      setIsOpen(true);
    },
    [setBrowserUrl, setCurrentUrl, setInputUrl, setActiveTab, setIsOpen],
  );

  const closeBrowser = useCallback(() => {
    setBrowserUrl(null);
    setCurrentUrl(null);
    setInputUrl("");
  }, [setBrowserUrl, setCurrentUrl, setInputUrl]);

  const reloadBrowser = useCallback(() => {
    const iframeRef = store.get(rightPanelIframeRefAtom);
    const currentUrl = store.get(rightPanelCurrentUrlAtom);
    const browserUrl = store.get(rightPanelBrowserUrlAtom);
    if (iframeRef.current && (currentUrl ?? browserUrl)) {
      iframeRef.current.src = currentUrl ?? browserUrl ?? "";
    }
  }, [store]);

  const handleUrlSubmit = useCallback(() => {
    const inputUrl = store.get(rightPanelInputUrlAtom);
    if (!inputUrl) {
      return;
    }
    if (isBlockedDomain(inputUrl)) {
      toast.warning("This website cannot be previewed instantly.", {
        description: "It blocks embedded views. Click to open in a new tab.",
        action: {
          label: "Open Link",
          onClick: () => window.open(inputUrl, "_blank"),
        },
        duration: 5000,
      });
      return;
    }
    setBrowserUrl(inputUrl);
    setCurrentUrl(inputUrl);
  }, [store, setBrowserUrl, setCurrentUrl]);

  return {
    openPanel,
    closePanel,
    togglePanel,
    setActiveTab,
    setWidth: setWidthClamped,
    setInputUrl,
    setCurrentUrl,
    openBrowser,
    closeBrowser,
    reloadBrowser,
    handleUrlSubmit,
  };
};

export const useRightPanel = (): RightPanelContextValue => {
  const { isOpen, activeTab, width, browserUrl, inputUrl } =
    useRightPanelState();
  const actions = useRightPanelActions();
  const isTodoSectionOpen = useRightPanelTodoState();
  const { setIsTodoSectionOpen } = useRightPanelTodoActions();

  return {
    isOpen,
    activeTab,
    width,
    openPanel: actions.openPanel,
    closePanel: actions.closePanel,
    togglePanel: actions.togglePanel,
    setActiveTab: actions.setActiveTab,
    setWidth: actions.setWidth,
    browserUrl,
    inputUrl,
    setInputUrl: actions.setInputUrl,
    setCurrentUrl: actions.setCurrentUrl,
    openBrowser: actions.openBrowser,
    closeBrowser: actions.closeBrowser,
    reloadBrowser: actions.reloadBrowser,
    handleUrlSubmit: actions.handleUrlSubmit,
    isTodoSectionOpen,
    setIsTodoSectionOpen,
  };
};

export type { RightPanelTab };
