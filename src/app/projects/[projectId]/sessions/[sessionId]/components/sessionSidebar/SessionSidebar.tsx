"use client";

import { MessageSquareIcon, PlugIcon } from "lucide-react";
import { type FC, useMemo } from "react";
import type { SidebarTab } from "@/components/GlobalSidebar";
import { GlobalSidebar } from "@/components/GlobalSidebar";
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
        title: "Sessions",
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
        title: "MCP Servers",
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
