import { Trans } from "@lingui/react";
import { useSetAtom } from "jotai";
import {
  ClipboardCheckIcon,
  FileTextIcon,
  GitCompareIcon,
  GlobeIcon,
  RefreshCwIcon,
  XIcon,
} from "lucide-react";
import type { FC, ReactNode } from "react";
import { useCallback, useEffect, useRef } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useDragResize } from "@/hooks/useDragResize";
import { useIsMobile } from "@/hooks/useIsMobile";
import { rightPanelIframeRefAtom } from "@/lib/atoms/rightPanel";
import { cn } from "@/lib/utils";
import {
  type RightPanelTab,
  useRightPanelActions,
  useRightPanelState,
} from "../../hooks/useRightPanel";

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
    icon: ClipboardCheckIcon,
    label: <Trans id="panel.tab.review" />,
  },
  { id: "browser", icon: GlobeIcon, label: <Trans id="panel.tab.browser" /> },
];

export const RightPanel: FC<RightPanelProps> = ({
  gitTabContent,
  filesToolsTabContent,
  reviewTabContent,
}) => {
  const { isOpen, activeTab, width, browserUrl, inputUrl } =
    useRightPanelState();
  const {
    closePanel,
    setActiveTab,
    setWidth,
    setInputUrl,
    setCurrentUrl,
    reloadBrowser,
    handleUrlSubmit,
  } = useRightPanelActions();
  const isMobile = useIsMobile();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const setIframeRef = useSetAtom(rightPanelIframeRefAtom);
  const lastTrackedUrlRef = useRef<string | null>(null);

  useEffect(() => {
    setIframeRef(iframeRef);
  }, [setIframeRef]);

  useEffect(() => {
    if (!browserUrl || !isOpen) {
      lastTrackedUrlRef.current = null;
      return;
    }

    const interval = window.setInterval(() => {
      try {
        const iframe = iframeRef.current;
        const href = iframe?.contentWindow?.location.href;
        if (!href || href === "about:blank") {
          return;
        }
        if (href !== lastTrackedUrlRef.current) {
          lastTrackedUrlRef.current = href;
          setCurrentUrl(href);
          setInputUrl(href);
        }
      } catch {
        // Cross-origin restriction - ignore
      }
    }, 500);

    return () => window.clearInterval(interval);
  }, [browserUrl, isOpen, setCurrentUrl, setInputUrl]);

  const handleResize = useCallback(
    (event: MouseEvent) => {
      const newWidth =
        ((window.innerWidth - event.clientX) / window.innerWidth) * 100;
      setWidth(newWidth);
    },
    [setWidth],
  );

  const { isResizing, handleMouseDown } = useDragResize({
    onResize: handleResize,
    enabled: isOpen && !isMobile,
  });

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

  const activeTabLabel = tabs.find((tab) => tab.id === activeTab)?.label;

  return (
    <div
      className={cn(
        "fixed bg-background border-border/60 shadow-2xl z-40 flex flex-col",
        isMobile ? "left-0 right-0" : "right-0 border-l",
      )}
      style={{
        top: "28px", // AppLayout header height (h-7 = 1.75rem = 28px)
        bottom: "0px",
        width: isMobile ? "100%" : `${width}%`,
        userSelect: isResizing ? "none" : "auto",
      }}
    >
      {/* Mobile header */}
      {isMobile && (
        <div className="flex items-center justify-between px-3 py-2 border-b border-border/60 bg-muted/10">
          <div className="text-xs font-medium text-muted-foreground">
            {activeTabLabel}
          </div>
          <button
            type="button"
            onClick={closePanel}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close right panel"
          >
            <XIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Resize handle */}
      {!isMobile && (
        <div
          className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-primary/40 active:bg-primary transition-colors z-10"
          style={{ pointerEvents: "auto" }}
          onMouseDown={handleMouseDown}
        />
      )}

      {/* Tab bar - icons only with hover for names */}
      <div
        className={cn(
          "flex items-center border-b border-border/60 bg-muted/20",
          isMobile ? "px-2 py-2" : "px-1.5 py-1",
        )}
      >
        <TooltipProvider>
          <div
            className={cn(
              "flex items-center",
              isMobile ? "gap-1 w-full justify-between" : "gap-0.5",
            )}
          >
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const button = (
                <button
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center justify-center rounded-md transition-all",
                    isMobile ? "w-16 h-10 flex-col gap-0.5" : "w-7 h-7",
                    isActive
                      ? "bg-background text-foreground shadow-sm border border-border/40"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                  )}
                  data-testid={`right-panel-tab-${tab.id}`}
                >
                  <Icon className={cn(isMobile ? "w-4 h-4" : "w-3.5 h-3.5")} />
                  {isMobile && (
                    <span className="text-[10px] leading-none">
                      {tab.label}
                    </span>
                  )}
                </button>
              );

              if (isMobile) {
                return <div key={tab.id}>{button}</div>;
              }

              return (
                <Tooltip key={tab.id}>
                  <TooltipTrigger asChild>{button}</TooltipTrigger>
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
