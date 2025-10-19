"use client";

import { Trans } from "@lingui/react";
import { ArrowLeftIcon, MessageSquareIcon, PlugIcon } from "lucide-react";
import Link from "next/link";
import { type FC, useMemo } from "react";
import type { SidebarTab } from "@/components/GlobalSidebar";
import { GlobalSidebar } from "@/components/GlobalSidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useProject } from "../../../../hooks/useProject";
import { McpTab } from "./McpTab";
import { MobileSidebar } from "./MobileSidebar";
import { SessionsTab } from "./SessionsTab";

export const SessionSidebar: FC<{
  currentSessionId: string;
  projectId: string;
  className?: string;
  isMobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
}> = ({
  currentSessionId,
  projectId,
  className,
  isMobileOpen = false,
  onMobileOpenChange,
}) => {
  const {
    data: projectData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useProject(projectId);
  const sessions = projectData.pages.flatMap((page) => page.sessions);

  const additionalTabs: SidebarTab[] = useMemo(
    () => [
      {
        id: "sessions",
        icon: MessageSquareIcon,
        title: "Show session list",
        content: (
          <SessionsTab
            sessions={sessions.map((session) => ({
              ...session,
              lastModifiedAt: new Date(session.lastModifiedAt),
            }))}
            currentSessionId={currentSessionId}
            projectId={projectId}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            onLoadMore={() => fetchNextPage()}
          />
        ),
      },
      {
        id: "mcp",
        icon: PlugIcon,
        title: "Show MCP server settings",
        content: <McpTab projectId={projectId} />,
      },
    ],
    [
      sessions,
      currentSessionId,
      projectId,
      hasNextPage,
      isFetchingNextPage,
      fetchNextPage,
    ],
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className={cn("hidden md:flex h-full", className)}>
        <GlobalSidebar
          projectId={projectId}
          additionalTabs={additionalTabs}
          defaultActiveTab="sessions"
          headerButton={
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/projects"
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
