import { Trans } from "@lingui/react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeftIcon,
  CalendarClockIcon,
  MessageSquareIcon,
  PlugIcon,
} from "lucide-react";
import { type FC, Suspense, useMemo } from "react";
import type { SidebarTab } from "@/components/GlobalSidebar";
import { GlobalSidebar } from "@/components/GlobalSidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Loading } from "../../../../../../../components/Loading";
import { McpTab } from "./McpTab";
import { MobileSidebar } from "./MobileSidebar";
import { SchedulerTab } from "./SchedulerTab";
import { SessionsTab } from "./SessionsTab";
import type { Tab } from "./schema";

export const SessionSidebar: FC<{
  currentSessionId: string;
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
  const additionalTabs: SidebarTab[] = useMemo(
    () => [
      {
        id: "sessions",
        icon: MessageSquareIcon,
        title: (
          <Trans id="sidebar.show.session.list" message="Show session list" />
        ),
        content: (
          <Suspense fallback={<Loading />}>
            <SessionsTab
              currentSessionId={currentSessionId}
              projectId={projectId}
            />
          </Suspense>
        ),
      },
      {
        id: "mcp",
        icon: PlugIcon,
        title: (
          <Trans
            id="sidebar.show.mcp.settings"
            message="Show MCP server settings"
          />
        ),
        content: <McpTab projectId={projectId} />,
      },
      {
        id: "scheduler",
        icon: CalendarClockIcon,
        title: (
          <Trans
            id="sidebar.show.scheduler.jobs"
            message="Show scheduler jobs"
          />
        ),
        content: (
          <SchedulerTab projectId={projectId} sessionId={currentSessionId} />
        ),
      },
    ],
    [currentSessionId, projectId],
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className={cn("hidden md:flex h-full", className)}>
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
                    className="w-12 h-12 flex items-center justify-center hover:bg-sidebar-accent transition-colors"
                  >
                    <ArrowLeftIcon className="w-4 h-4 text-sidebar-foreground/70" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>
                    <Trans
                      id="sidebar.back.to.projects"
                      message="Back to projects"
                    />
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          }
        />
      </div>

      {/* Mobile sidebar */}
      <MobileSidebar
        currentSessionId={currentSessionId}
        projectId={projectId}
        isOpen={isMobileOpen}
        onClose={() => onMobileOpenChange?.(false)}
      />
    </>
  );
};
