import { Trans } from "@lingui/react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeftIcon,
  CalendarClockIcon,
  ListTodoIcon,
  MessageSquareIcon,
  PlugIcon,
} from "lucide-react";
import { type FC, Suspense, useCallback, useMemo, useState } from "react";
import type { SidebarTab } from "@/components/GlobalSidebar";
import { GlobalSidebar } from "@/components/GlobalSidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  useLeftPanelActions,
  useLeftPanelState,
} from "@/hooks/useLayoutPanels";
import { cn } from "@/lib/utils";
import { Loading } from "../../../../../../../components/Loading";
import { McpTab } from "./McpTab";
import { MobileSidebar } from "./MobileSidebar";
import { SchedulerTab } from "./SchedulerTab";
import { SessionsTab } from "./SessionsTab";
import type { Tab } from "./schema";
import { TasksTab } from "./TasksTab";

export const SessionSidebar: FC<{
  currentSessionId?: string;
  projectId: string;
  className?: string;
  isMobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
  initialTab: Tab;
}> = ({
  currentSessionId,
  projectId,
  className,
  isMobileOpen = false,
  onMobileOpenChange,
  initialTab,
}) => {
  const { isLeftPanelOpen } = useLeftPanelState();
  const { toggleLeftPanel } = useLeftPanelActions();
  const isMobile = useIsMobile();
  const activeSessionId = currentSessionId ?? "";
  const [mobileActiveTab, setMobileActiveTab] = useState<string>(initialTab);
  const additionalTabs: SidebarTab[] = useMemo(
    () => [
      {
        id: "sessions",
        icon: MessageSquareIcon,
        title: <Trans id="sidebar.show.session.list" />,
        content: (
          <Suspense fallback={<Loading />}>
            <SessionsTab
              currentSessionId={activeSessionId}
              projectId={projectId}
            />
          </Suspense>
        ),
      },
      {
        id: "mcp",
        icon: PlugIcon,
        title: <Trans id="sidebar.show.mcp.settings" />,
        content: <McpTab projectId={projectId} />,
      },
      {
        id: "tasks",
        icon: ListTodoIcon,
        title: <Trans id="sidebar.show.task.list" />,
        content: <TasksTab projectId={projectId} sessionId={activeSessionId} />,
      },
      {
        id: "scheduler",
        icon: CalendarClockIcon,
        title: <Trans id="sidebar.show.scheduler.jobs" />,
        content: (
          <SchedulerTab projectId={projectId} sessionId={activeSessionId} />
        ),
      },
    ],
    [activeSessionId, projectId],
  );

  const handleMobileTabClick = useCallback(
    (tabId: string) => {
      if (isMobileOpen && mobileActiveTab === tabId) {
        // Same tab clicked while open - close
        onMobileOpenChange?.(false);
      } else {
        // Different tab or panel closed - open with this tab
        setMobileActiveTab(tabId);
        onMobileOpenChange?.(true);
      }
    },
    [isMobileOpen, mobileActiveTab, onMobileOpenChange],
  );

  return (
    <>
      {/* Sidebar - takes full width of parent container */}
      <div className={cn("flex h-full w-full", className)}>
        <GlobalSidebar
          projectId={projectId}
          additionalTabs={additionalTabs}
          defaultActiveTab={initialTab}
          headerButton={
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    to="/projects"
                    className="w-(--spacing-sidebar-icon-menu-mobile) h-(--spacing-sidebar-icon-menu-mobile) md:w-(--spacing-sidebar-icon-menu) md:h-(--spacing-sidebar-icon-menu) flex items-center justify-center hover:bg-sidebar-accent transition-colors"
                  >
                    <ArrowLeftIcon className="w-4 h-4 text-sidebar-foreground/70" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>
                    <Trans id="sidebar.back.to.projects" />
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          }
          fillWidth
          isContentHidden={isMobile || !isLeftPanelOpen}
          onToggle={toggleLeftPanel}
          onMobileTabClick={isMobile ? handleMobileTabClick : undefined}
        />
      </div>

      {/* Mobile sidebar overlay - content only, icon menu is always visible */}
      <MobileSidebar
        currentSessionId={activeSessionId}
        projectId={projectId}
        isOpen={isMobileOpen}
        onClose={() => onMobileOpenChange?.(false)}
        initialTab={mobileActiveTab}
      />
    </>
  );
};
