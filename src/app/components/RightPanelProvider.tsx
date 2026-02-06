import type { FC, ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { BrowserPreviewContext } from "../../hooks/useBrowserPreview";
import {
  RightPanelContext,
  type RightPanelTab,
} from "../../hooks/useRightPanel";

interface RightPanelProviderProps {
  children: ReactNode;
}

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

export const RightPanelProvider: FC<RightPanelProviderProps> = ({
  children,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<RightPanelTab>("git");
  const [width, setWidth] = useState(50);
  const [isTodoSectionOpen, setIsTodoSectionOpen] = useState(false);

  // Browser state
  const [browserUrl, setBrowserUrl] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [inputUrl, setInputUrl] = useState<string>("");
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const openPanel = useCallback((tab?: RightPanelTab) => {
    setIsOpen(true);
    if (tab) {
      setActiveTab(tab);
    }
  }, []);

  const closePanel = useCallback(() => {
    setIsOpen(false);
  }, []);

  const togglePanel = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const openBrowser = useCallback((url: string) => {
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
  }, []);

  const closeBrowser = useCallback(() => {
    setBrowserUrl(null);
    setCurrentUrl(null);
    setInputUrl("");
  }, []);

  const reloadBrowser = useCallback(() => {
    if (iframeRef.current && (currentUrl ?? browserUrl)) {
      iframeRef.current.src = currentUrl ?? browserUrl ?? "";
    }
  }, [currentUrl, browserUrl]);

  const handleUrlSubmit = useCallback(() => {
    if (inputUrl) {
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
    }
  }, [inputUrl]);

  // Track iframe URL changes
  useEffect(() => {
    if (!browserUrl) return;

    const interval = setInterval(() => {
      try {
        const iframe = iframeRef.current;
        if (iframe?.contentWindow?.location.href) {
          const newUrl = iframe.contentWindow.location.href;
          if (newUrl !== "about:blank" && newUrl !== currentUrl) {
            setCurrentUrl(newUrl);
            setInputUrl(newUrl);
          }
        }
      } catch {
        // Cross-origin restriction - ignore
      }
    }, 500);

    return () => clearInterval(interval);
  }, [browserUrl, currentUrl]);

  // BrowserPreviewContext compatibility layer
  const browserPreviewValue = {
    previewUrl: browserUrl,
    previewWidth: isOpen ? width : 0,
    openPreview: openBrowser,
    closePreview: closeBrowser,
    reloadPreview: reloadBrowser,
  };

  const rightPanelValue = {
    isOpen,
    activeTab,
    width,
    openPanel,
    closePanel,
    togglePanel,
    setActiveTab,
    setWidth,
    browserUrl,
    inputUrl,
    setInputUrl,
    openBrowser,
    closeBrowser,
    reloadBrowser,
    handleUrlSubmit,
    iframeRef,
    isTodoSectionOpen,
    setIsTodoSectionOpen,
  };

  return (
    <RightPanelContext.Provider value={rightPanelValue}>
      <BrowserPreviewContext.Provider value={browserPreviewValue}>
        {children}
      </BrowserPreviewContext.Provider>
    </RightPanelContext.Provider>
  );
};
