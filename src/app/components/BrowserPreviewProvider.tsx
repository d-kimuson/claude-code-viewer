import type { FC, ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { BrowserPreviewContext } from "../../hooks/useBrowserPreview";

interface BrowserPreviewProviderProps {
  children: ReactNode;
}

const isBlockedDomain = (url: string) => {
  try {
    const hostname = new URL(url).hostname;
    // Common domains that block iframing
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

export const BrowserPreviewProvider: FC<BrowserPreviewProviderProps> = ({
  children,
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [inputUrl, setInputUrl] = useState<string>("");
  const [reloadKey, setReloadKey] = useState(0);
  const [width, setWidth] = useState(50); // percentage
  const [isResizing, setIsResizing] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const isResizingRef = useRef(false);

  const openPreview = useCallback((url: string) => {
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
    setPreviewUrl(url);
    setCurrentUrl(url);
    setInputUrl(url);
  }, []);

  const closePreview = useCallback(() => {
    setPreviewUrl(null);
    setCurrentUrl(null);
    setInputUrl("");
    setReloadKey(0);
  }, []);

  const reloadPreview = useCallback(() => {
    if (iframeRef.current) {
      iframeRef.current.src = currentUrl || previewUrl || "";
    }
  }, [currentUrl, previewUrl]);

  // Track iframe URL changes
  useEffect(() => {
    if (!iframeRef.current) return;

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
  }, [currentUrl]);

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
      setPreviewUrl(inputUrl);
      setCurrentUrl(inputUrl);
    }
  }, [inputUrl]);

  const handleUrlKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        handleUrlSubmit();
      }
    },
    [handleUrlSubmit],
  );

  // Handle resize with strict state management
  const stopResizing = useCallback(() => {
    isResizingRef.current = false;
    setIsResizing(false);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isResizingRef.current = true;
    setIsResizing(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return;
      e.preventDefault();

      const newWidth =
        ((window.innerWidth - e.clientX) / window.innerWidth) * 100;
      setWidth(Math.max(20, Math.min(80, newWidth))); // Clamp between 20% and 80%
    };

    const handleMouseUp = (e: MouseEvent) => {
      e.preventDefault();
      stopResizing();
    };

    // Handle edge cases where mouse events might be missed
    const handleMouseLeave = () => {
      stopResizing();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopResizing();
      }
    };

    const handleBlur = () => {
      stopResizing();
    };

    // Always attach listeners
    document.addEventListener("mousemove", handleMouseMove, { passive: false });
    document.addEventListener("mouseup", handleMouseUp, { passive: false });
    document.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
    };
  }, [stopResizing]);

  // Handle body style changes
  useEffect(() => {
    if (isResizing) {
      document.body.style.userSelect = "none";
      document.body.style.cursor = "ew-resize";
      document.body.style.pointerEvents = "none";
    } else {
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      document.body.style.pointerEvents = "";
    }

    return () => {
      // Cleanup on unmount
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      document.body.style.pointerEvents = "";
    };
  }, [isResizing]);

  return (
    <BrowserPreviewContext.Provider
      value={{
        previewUrl,
        previewWidth: width,
        openPreview,
        closePreview,
        reloadPreview,
      }}
    >
      {children}
      {previewUrl && (
        <div
          className="fixed right-0 top-0 bottom-0 bg-background border-l-4 border-primary/20 shadow-2xl z-50 flex flex-col"
          style={{
            width: `${width}%`,
            userSelect: isResizing ? "none" : "auto",
          }}
        >
          {/* Resize handle */}
          <div
            className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-primary/50 transition-colors active:bg-primary z-10"
            style={{ pointerEvents: "auto" }}
            onMouseDown={handleMouseDown}
          />

          <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-border bg-muted/30">
            <button
              type="button"
              onClick={reloadPreview}
              className="p-1.5 hover:bg-muted rounded transition-colors"
              aria-label="Reload"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                role="img"
                aria-labelledby="reload-icon-title"
              >
                <title id="reload-icon-title">Reload</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              onKeyDown={handleUrlKeyDown}
              placeholder="Enter URL and press Enter"
              className="flex-1 px-2 py-1 bg-background border border-border rounded text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              type="button"
              onClick={closePreview}
              className="p-1.5 hover:bg-muted rounded transition-colors"
              aria-label="Close"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                role="img"
                aria-labelledby="close-icon-title"
              >
                <title id="close-icon-title">Close</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <iframe
            ref={iframeRef}
            key={reloadKey}
            src={previewUrl}
            className="flex-1 w-full h-full border-0"
            title="Browser Preview"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
          />
        </div>
      )}
    </BrowserPreviewContext.Provider>
  );
};
