import { Trans } from "@lingui/react";
import { GitBranchIcon, PanelBottomIcon, PanelLeftIcon, PanelRightIcon } from "lucide-react";
import type { FC, ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  useBottomPanelActions,
  useBottomPanelState,
  useLeftPanelActions,
  useLeftPanelState,
} from "@/hooks/useLayoutPanels";
import { useRightPanelActions, useRightPanelOpen } from "@/hooks/useRightPanel";
import { cn } from "@/lib/utils";
import { NotificationBell } from "./NotificationBell";
import { ProjectSwitcher } from "./ProjectSwitcher";

type AppLayoutProps = {
  children: ReactNode;
  // Session context info
  projectId?: string;
  projectPath?: string;
  currentBranch?: string;
  sessionId?: string;
};

export const AppLayout: FC<AppLayoutProps> = ({
  children,
  projectId,
  projectPath,
  currentBranch,
  sessionId,
}) => {
  const { isLeftPanelOpen } = useLeftPanelState();
  const { setIsLeftPanelOpen } = useLeftPanelActions();
  const { isBottomPanelOpen } = useBottomPanelState();
  const { setIsBottomPanelOpen } = useBottomPanelActions();
  const isRightPanelOpen = useRightPanelOpen();
  const { togglePanel: toggleRightPanel } = useRightPanelActions();

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background">
      {/* Top Status Bar */}
      <header className="h-(--spacing-header-height) flex items-center justify-between px-3 bg-muted/30 border-b border-border/40 text-xs flex-shrink-0 select-none">
        {/* Left: Project/Session Info */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1 overflow-x-auto overflow-y-hidden">
          <div className="shrink-0">
            <ProjectSwitcher currentProjectId={projectId} currentProjectPath={projectPath} />
          </div>
          {currentBranch !== undefined && currentBranch !== "" && (
            <Badge
              variant="outline"
              className="h-5 text-[11px] px-2 bg-background/50 border-border/60 gap-1 shrink-0"
            >
              <GitBranchIcon className="w-3 h-3" />
              <span className="max-w-[100px] truncate">{currentBranch}</span>
            </Badge>
          )}
          {sessionId !== undefined && sessionId !== "" && (
            <Badge
              variant="outline"
              className="h-5 text-[11px] px-2 bg-background/50 border-border/60 font-mono shrink-0 whitespace-nowrap hidden md:flex"
            >
              {sessionId}
            </Badge>
          )}
        </div>

        {/* Right: Notifications + Panel Toggle Buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <NotificationBell sessionId={sessionId} />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => {
                    setIsLeftPanelOpen(!isLeftPanelOpen);
                  }}
                  className={cn(
                    "hidden md:flex w-7 h-7 items-center justify-center rounded transition-colors",
                    isLeftPanelOpen
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground",
                  )}
                  aria-label="Toggle left panel"
                >
                  <PanelLeftIcon className="w-3.5 h-3.5" />
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
                    "w-11 h-11 md:w-7 md:h-7 flex items-center justify-center rounded transition-colors",
                    isBottomPanelOpen
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground",
                  )}
                  aria-label="Toggle bottom panel"
                >
                  <PanelBottomIcon className="w-3.5 h-3.5" />
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
                    "w-11 h-11 md:w-7 md:h-7 flex items-center justify-center rounded transition-colors",
                    isRightPanelOpen
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground",
                  )}
                  aria-label="Toggle right panel"
                >
                  <PanelRightIcon className="w-3.5 h-3.5" />
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
