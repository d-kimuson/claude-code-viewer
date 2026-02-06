import { Trans } from "@lingui/react";
import {
  FileTextIcon,
  GitCompareIcon,
  GitPullRequestIcon,
  GlobeIcon,
  RefreshCwIcon,
} from "lucide-react";
import type { FC, ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { type RightPanelTab, useRightPanel } from "../../hooks/useRightPanel";

interface RightPanelProps {
  projectId: string;
  sessionId?: string;
  gitTabContent?: ReactNode;
  filesToolsTabContent?: ReactNode;
  reviewTabContent?: ReactNode;
}

interface TabConfig {
  id: RightPanelTab;
  icon: typeof GlobeIcon;
  label: ReactNode;
}

const tabs: TabConfig[] = [
  {
    id: "git",
    icon: GitCompareIcon,
    label: <Trans id="panel.tab.git" />,
  },
  {
    id: "files-tools",
    icon: FileTextIcon,
    label: <Trans id="panel.tab.files_tools" />,
  },
  {
    id: "review",
    icon: GitPullRequestIcon,
    label: <Trans id="panel.tab.review" />,
  },
  { id: "browser", icon: GlobeIcon, label: <Trans id="panel.tab.browser" /> },
];

export const RightPanel: FC<RightPanelProps> = ({
  gitTabContent,
  filesToolsTabContent,
  reviewTabContent,
}) => {
  const {
    isOpen,
    activeTab,
    width,
    setActiveTab,
    setWidth,
    browserUrl,
    inputUrl,
    setInputUrl,
    reloadBrowser,
    handleUrlSubmit,
    iframeRef,
  } = useRightPanel();

  const [isResizing, setIsResizing] = useState(false);
  const isResizingRef = useRef(false);

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
      setWidth(Math.max(20, Math.min(80, newWidth)));
    };

    const handleMouseUp = (e: MouseEvent) => {
      e.preventDefault();
      stopResizing();
    };

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
  }, [stopResizing, setWidth]);

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
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      document.body.style.pointerEvents = "";
    };
  }, [isResizing]);

  const handleUrlKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        handleUrlSubmit();
      }
    },
    [handleUrlSubmit],
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed right-0 bg-background border-l border-border/60 shadow-2xl z-40 flex flex-col"
      style={{
        top: "28px", // AppLayout header height (h-7 = 1.75rem = 28px)
        bottom: "0px",
        width: `${width}%`,
        userSelect: isResizing ? "none" : "auto",
      }}
    >
      {/* Resize handle */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-primary/40 active:bg-primary transition-colors z-10"
        style={{ pointerEvents: "auto" }}
        onMouseDown={handleMouseDown}
      />

      {/* Tab bar - icons only with hover for names */}
      <div className="flex items-center border-b border-border/60 bg-muted/20 px-1.5 py-1">
        <TooltipProvider>
          <div className="flex items-center gap-0.5">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <Tooltip key={tab.id}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "w-7 h-7 flex items-center justify-center rounded-md transition-all",
                        isActive
                          ? "bg-background text-foreground shadow-sm border border-border/40"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{tab.label}</TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>
      </div>

      {/* Tab content */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {activeTab === "git" && (
          <div className="flex-1 overflow-auto">{gitTabContent}</div>
        )}
        {activeTab === "files-tools" && (
          <div className="flex-1 overflow-auto">{filesToolsTabContent}</div>
        )}
        {activeTab === "review" && (
          <div className="flex-1 overflow-auto">{reviewTabContent}</div>
        )}
        {activeTab === "browser" && (
          <BrowserTabContent
            browserUrl={browserUrl}
            inputUrl={inputUrl}
            setInputUrl={setInputUrl}
            onReload={reloadBrowser}
            onUrlKeyDown={handleUrlKeyDown}
            iframeRef={iframeRef}
          />
        )}
      </div>
    </div>
  );
};

interface BrowserTabContentProps {
  browserUrl: string | null;
  inputUrl: string;
  setInputUrl: (url: string) => void;
  onReload: () => void;
  onUrlKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
}

const BrowserTabContent: FC<BrowserTabContentProps> = ({
  browserUrl,
  inputUrl,
  setInputUrl,
  onReload,
  onUrlKeyDown,
  iframeRef,
}) => {
  return (
    <>
      {/* URL bar */}
      <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-border/40 bg-muted/10">
        <button
          type="button"
          onClick={onReload}
          className="p-1.5 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground"
          aria-label="Reload"
        >
          <RefreshCwIcon className="w-3.5 h-3.5" />
        </button>
        <input
          type="text"
          value={inputUrl}
          onChange={(e) => setInputUrl(e.target.value)}
          onKeyDown={onUrlKeyDown}
          placeholder="Enter URL and press Enter"
          className="flex-1 px-2.5 py-1.5 bg-background border border-border/60 rounded-md text-xs text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
        />
      </div>

      {/* Browser content */}
      {browserUrl ? (
        <iframe
          ref={iframeRef}
          src={browserUrl}
          className="flex-1 w-full h-full border-0 bg-white"
          title="Browser Preview"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
        />
      ) : (
        <div className="flex-1 flex items-center justify-center bg-muted/5">
          <div className="text-center space-y-3 px-8">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-muted/30 flex items-center justify-center">
              <GlobeIcon className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">
                <Trans id="panel.browser.empty.title" />
              </p>
              <p className="text-xs text-muted-foreground/70">
                <Trans id="panel.browser.empty.description" />
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
