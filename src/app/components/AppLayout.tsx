import { Trans } from "@lingui/react";
import {
  GitBranchIcon,
  PanelBottomIcon,
  PanelLeftIcon,
  PanelRightIcon,
} from "lucide-react";
import type { FC, ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useLayoutPanels } from "@/hooks/useLayoutPanels";
import { useRightPanel } from "@/hooks/useRightPanel";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: ReactNode;
  // Session context info
  projectPath?: string;
  currentBranch?: string;
  sessionId?: string;
  projectName?: string;
  onMobileLeftPanelOpen?: () => void;
}

export const AppLayout: FC<AppLayoutProps> = ({
  children,
  projectPath,
  currentBranch,
  sessionId,
  projectName,
  onMobileLeftPanelOpen,
}) => {
  const isMobile = useIsMobile();
  const {
    isLeftPanelOpen,
    setIsLeftPanelOpen,
    isBottomPanelOpen,
    setIsBottomPanelOpen,
  } = useLayoutPanels();
  const { isOpen: isRightPanelOpen, togglePanel: toggleRightPanel } =
    useRightPanel();

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background">
      {/* Top Status Bar */}
      <header className="h-7 flex items-center justify-between px-2 bg-muted/30 border-b border-border/40 text-[11px] flex-shrink-0 select-none">
        {/* Left: Project/Session Info */}
        <div className="flex items-center gap-2 min-w-0 flex-1 overflow-x-auto overflow-y-hidden">
          {projectName && (
            <span className="text-foreground/70 font-medium truncate">
              {projectName}
            </span>
          )}
          {projectPath && (
            <Badge
              variant="outline"
              className="h-4 text-[10px] px-1.5 bg-background/50 border-border/60 shrink-0 whitespace-nowrap"
            >
              {projectPath}
            </Badge>
          )}
          {currentBranch && (
            <Badge
              variant="outline"
              className="h-4 text-[10px] px-1.5 bg-background/50 border-border/60 gap-0.5 shrink-0"
            >
              <GitBranchIcon className="w-2.5 h-2.5" />
              <span className="max-w-[80px] truncate">{currentBranch}</span>
            </Badge>
          )}
          {sessionId && (
            <Badge
              variant="outline"
              className="h-4 text-[10px] px-1.5 bg-background/50 border-border/60 font-mono shrink-0 whitespace-nowrap"
            >
              {sessionId}
            </Badge>
          )}
        </div>

        {/* Right: Panel Toggle Buttons */}
        <div className="flex items-center gap-0.5 shrink-0">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => {
                    if (isMobile) {
                      onMobileLeftPanelOpen?.();
                      return;
                    }
                    setIsLeftPanelOpen(!isLeftPanelOpen);
                  }}
                  className={cn(
                    "w-5 h-5 flex items-center justify-center rounded transition-colors",
                    isLeftPanelOpen
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground",
                  )}
                  aria-label="Toggle left panel"
                >
                  <PanelLeftIcon className="w-3 h-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                <Trans id="layout.toggle_left_panel" />
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setIsBottomPanelOpen(!isBottomPanelOpen)}
                  className={cn(
                    "w-5 h-5 flex items-center justify-center rounded transition-colors",
                    isBottomPanelOpen
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground",
                  )}
                  aria-label="Toggle bottom panel"
                >
                  <PanelBottomIcon className="w-3 h-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                <Trans id="layout.toggle_bottom_panel" />
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={toggleRightPanel}
                  className={cn(
                    "w-5 h-5 flex items-center justify-center rounded transition-colors",
                    isRightPanelOpen
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground",
                  )}
                  aria-label="Toggle right panel"
                >
                  <PanelRightIcon className="w-3 h-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                <Trans id="layout.toggle_right_panel" />
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
    </div>
  );
};
