import { Trans } from "@lingui/react";
import { Link } from "@tanstack/react-router";
import { useAtomValue } from "jotai";
import { MessageSquareIcon, PlusIcon } from "lucide-react";
import { type FC, useEffect, useMemo, useRef } from "react";
import { formatLocaleDate } from "@/lib/date/formatLocaleDate";
import { createVirtualSessionEntries } from "@/lib/virtual-messages/createVirtualSessionEntries";
import {
  removeVirtualMessage,
  virtualMessagesAtom,
} from "@/lib/virtual-messages/virtualMessageStore";
import { Badge } from "@/web/components/ui/badge";
import { Button } from "@/web/components/ui/button";
import { cn } from "@/web/utils";
import { useConfig } from "../../../../../../hooks/useConfig";
import { useProject } from "../../../../hooks/useProject";
import { resolveSessionTitle } from "../../../../services/firstCommandToTitle";
import { sessionProcessesAtom } from "../../store/sessionProcessesAtom";

export const SessionsTab: FC<{
  currentSessionId: string;
  projectId: string;
  onSessionSelect?: () => void;
}> = ({ currentSessionId, projectId, onSessionSelect }) => {
  const {
    data: projectData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useProject(projectId);
  const sessionProcesses = useAtomValue(sessionProcessesAtom);
  const virtualMessages = useAtomValue(virtualMessagesAtom);

  const sessions = useMemo(() => {
    const serverSessions = projectData.pages.flatMap((page) => page.sessions);
    const existingIds = new Set(serverSessions.map((s) => s.id));
    const virtualSessions = createVirtualSessionEntries(virtualMessages, projectId, existingIds);
    return [...serverSessions, ...virtualSessions];
  }, [projectData.pages, projectId, virtualMessages]);

  // Clean up virtual messages once the server session list includes them
  useEffect(() => {
    const serverIds = new Set(projectData.pages.flatMap((page) => page.sessions).map((s) => s.id));
    for (const vm of virtualMessages.values()) {
      if (vm.projectId === projectId && serverIds.has(vm.sessionId)) {
        removeVirtualMessage(vm.sessionId);
      }
    }
  }, [projectData.pages, projectId, virtualMessages]);

  const { config } = useConfig();
  const activeSessionRef = useRef<HTMLAnchorElement>(null);

  // Scroll the active session into view when switching sessions.
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally fires on currentSessionId change only
  useEffect(() => {
    activeSessionRef.current?.scrollIntoView({
      block: "nearest",
      behavior: "smooth",
    });
  }, [currentSessionId]);
  const currentTab = "sessions";

  const isNewChatActive = currentSessionId === "";

  // Sort sessions: Running > Paused > Others, then by lastModifiedAt (newest first)
  const sortedSessions = useMemo(() => {
    // Define priority: running = 0, paused = 1, others = 2
    const getPriority = (status: "paused" | "running" | undefined) => {
      if (status === "running") return 0;
      if (status === "paused") return 1;
      return 2;
    };

    return [...sessions].sort((a, b) => {
      const aStatus = sessionProcesses.find((process) => process.sessionId === a.id)?.status;
      const bStatus = sessionProcesses.find((process) => process.sessionId === b.id)?.status;

      const aPriority = getPriority(aStatus);
      const bPriority = getPriority(bStatus);

      // First sort by priority
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      // Then sort by lastModifiedAt (newest first)
      const aTime = a.lastModifiedAt ? new Date(a.lastModifiedAt).getTime() : 0;
      const bTime = b.lastModifiedAt ? new Date(b.lastModifiedAt).getTime() : 0;
      return bTime - aTime;
    });
  }, [sessions, sessionProcesses]);

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-sidebar-border p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-lg">
            <Trans id="sessions.title" />
          </h2>
        </div>
        <p className="text-xs text-sidebar-foreground/70">
          {sessions.length} <Trans id="sessions.total" />
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        <Link
          to="/projects/$projectId/session"
          params={{ projectId }}
          search={{ tab: currentTab }}
          onClick={onSessionSelect}
          className={cn(
            "block rounded-lg p-2.5 transition-all duration-200 border-2 border-dashed border-sidebar-border/60 hover:border-blue-400/80 hover:bg-blue-50/50 dark:hover:bg-blue-950/40 bg-sidebar/10",
            isNewChatActive &&
              "bg-blue-100 dark:bg-blue-900/40 border-blue-400 dark:border-blue-500 shadow-sm",
          )}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <PlusIcon className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-sidebar-foreground">
                <Trans id="chat.modal.title" />
              </p>
            </div>
          </div>
        </Link>
        {sortedSessions.map((session) => {
          const isActive = session.id === currentSessionId;
          const title = resolveSessionTitle(
            session.meta.customTitle,
            session.meta.firstUserMessage,
            session.id,
          );

          const sessionProcess = sessionProcesses.find((task) => task.sessionId === session.id);
          const isRunning = sessionProcess?.status === "running";
          const isPaused = sessionProcess?.status === "paused";

          return (
            <Link
              key={session.id}
              ref={isActive ? activeSessionRef : undefined}
              to="/projects/$projectId/session"
              params={{ projectId }}
              search={{ tab: currentTab, sessionId: session.id }}
              onClick={onSessionSelect}
              className={cn(
                "group relative block rounded-lg p-2.5 transition-all duration-200 hover:bg-blue-50/60 dark:hover:bg-blue-950/40 hover:border-blue-300/60 dark:hover:border-blue-700/60 hover:shadow-sm border border-sidebar-border/40 bg-sidebar/30",
                isActive &&
                  "bg-blue-100 dark:bg-blue-900/50 border-blue-400 dark:border-blue-600 shadow-md ring-1 ring-blue-200/50 dark:ring-blue-700/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 hover:border-blue-400 dark:hover:border-blue-600",
              )}
            >
              <div className="space-y-1.5">
                <div className="flex items-start justify-between gap-2 pr-6">
                  <h3 className="text-sm font-medium line-clamp-2 leading-tight text-sidebar-foreground flex-1">
                    {title}
                  </h3>
                  {(isRunning || isPaused) && (
                    <Badge
                      variant={isRunning ? "default" : "secondary"}
                      className={cn(
                        "text-xs shrink-0",
                        isRunning && "bg-green-500 text-white",
                        isPaused && "bg-yellow-500 text-white",
                      )}
                    >
                      {isRunning ? (
                        <Trans id="session.status.running" />
                      ) : (
                        <Trans id="session.status.paused" />
                      )}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs text-sidebar-foreground/70 min-w-0">
                    <div className="flex items-center gap-1">
                      <MessageSquareIcon className="w-3 h-3" />
                      <span>{session.meta.messageCount}</span>
                    </div>
                  </div>
                  {session.lastModifiedAt && (
                    <span className="text-xs text-sidebar-foreground/60 shrink-0">
                      {formatLocaleDate(session.lastModifiedAt, {
                        locale: config.locale,
                        target: "time",
                      })}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}

        {/* Load More Button */}
        {hasNextPage === true && (
          <div className="p-2">
            <Button
              onClick={() => {
                void fetchNextPage();
              }}
              disabled={isFetchingNextPage}
              variant="outline"
              size="sm"
              className="w-full"
            >
              {isFetchingNextPage ? (
                <Trans id="common.loading" />
              ) : (
                <Trans id="sessions.load.more" />
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
