import { Trans } from "@lingui/react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeftIcon,
  CalendarClockIcon,
  ListTodoIcon,
  MessageSquareIcon,
  PlugIcon,
} from "lucide-react";
import { type FC, Suspense, useMemo } from "react";
import { GlobalSidebar, type SidebarTab } from "@/components/GlobalSidebar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useLeftPanelActions, useLeftPanelState } from "@/hooks/useLayoutPanels";
import { cn } from "@/lib/utils";
import { Loading } from "../../../../../../../components/Loading";
import { McpTab } from "./McpTab";
import { SchedulerTab } from "./SchedulerTab";
import type { Tab } from "./schema";
import { SessionsTab } from "./SessionsTab";
import { TasksTab } from "./TasksTab";

export const SessionSidebar: FC<{
  currentSessionId?: string;
  projectId: string;
  className?: string;
  initialTab: Tab;
}> = ({ currentSessionId, projectId, className, initialTab }) => {
  const { isLeftPanelOpen } = useLeftPanelState();
  const { toggleLeftPanel } = useLeftPanelActions();
  const activeSessionId = currentSessionId ?? "";
  const additionalTabs: SidebarTab[] = useMemo(
    () => [
      {
        id: "sessions",
        icon: MessageSquareIcon,
        title: <Trans id="sidebar.show.session.list" />,
        content: (
          <Suspense fallback={<Loading />}>
            <SessionsTab currentSessionId={activeSessionId} projectId={projectId} />
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
        content: <SchedulerTab projectId={projectId} sessionId={activeSessionId} />,
      },
    ],
    [activeSessionId, projectId],
  );

  return (
    <div className={cn("hidden md:flex h-full w-full", className)}>
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
                  className="w-(--spacing-sidebar-icon-menu) h-(--spacing-sidebar-icon-menu) flex items-center justify-center hover:bg-sidebar-accent transition-colors"
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
        isContentHidden={!isLeftPanelOpen}
        onToggle={toggleLeftPanel}
      />
    </div>
  );
};
