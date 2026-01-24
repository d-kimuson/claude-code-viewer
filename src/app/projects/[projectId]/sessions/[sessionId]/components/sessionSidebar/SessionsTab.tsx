import { Trans } from "@lingui/react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useAtomValue } from "jotai";
import {
  CoinsIcon,
  MessageSquareIcon,
  PlusIcon,
  TrashIcon,
} from "lucide-react";
import { type FC, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatLocaleDate } from "../../../../../../../lib/date/formatLocaleDate";
import { useConfig } from "../../../../../../hooks/useConfig";
import { useProject } from "../../../../hooks/useProject";
import { firstUserMessageToTitle } from "../../../../services/firstCommandToTitle";
import { sessionProcessesAtom } from "../../store/sessionProcessesAtom";
import { DeleteSessionDialog } from "./DeleteSessionDialog";

export const SessionsTab: FC<{
  currentSessionId: string;
  projectId: string;
  isMobile?: boolean;
}> = ({ currentSessionId, projectId }) => {
  const {
    data: projectData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useProject(projectId);
  const sessions = projectData.pages.flatMap((page) => page.sessions);

  const sessionProcesses = useAtomValue(sessionProcessesAtom);
  const { config } = useConfig();
  const search = useSearch({
    from: "/projects/$projectId/session",
  });
  const navigate = useNavigate();

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingSession, setDeletingSession] = useState<{
    id: string;
    title: string;
  } | null>(null);

  // Preserve current tab state or default to "sessions"
  const currentTab = search.tab ?? "sessions";

  const isNewChatActive = currentSessionId === "";

  // Sort sessions: Running > Paused > Others, then by lastModifiedAt (newest first)
  const sortedSessions = [...sessions].sort((a, b) => {
    const aProcess = sessionProcesses.find(
      (process) => process.sessionId === a.id,
    );
    const bProcess = sessionProcesses.find(
      (process) => process.sessionId === b.id,
    );

    const aStatus = aProcess?.status;
    const bStatus = bProcess?.status;

    // Define priority: running = 0, paused = 1, others = 2
    const getPriority = (status: "paused" | "running" | undefined) => {
      if (status === "running") return 0;
      if (status === "paused") return 1;
      return 2;
    };

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

  const handleDeleteClick = (
    e: React.MouseEvent,
    sessionId: string,
    sessionTitle: string,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setDeletingSession({ id: sessionId, title: sessionTitle });
    setDeleteDialogOpen(true);
  };

  const handleDeleteSuccess = () => {
    const deletedSessionId = deletingSession?.id;
    setDeletingSession(null);

    // If the deleted session was the current one, navigate to the new chat page
    if (deletedSessionId === currentSessionId) {
      void navigate({
        to: "/projects/$projectId/session",
        params: { projectId },
        search: { tab: currentTab },
      });
    }
  };

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
          const title =
            session.meta.firstUserMessage !== null
              ? firstUserMessageToTitle(session.meta.firstUserMessage)
              : session.id;

          const sessionProcess = sessionProcesses.find(
            (task) => task.sessionId === session.id,
          );
          const isRunning = sessionProcess?.status === "running";
          const isPaused = sessionProcess?.status === "paused";

          return (
            <Link
              key={session.id}
              to="/projects/$projectId/session"
              params={{ projectId }}
              search={{ tab: currentTab, sessionId: session.id }}
              className={cn(
                "group relative block rounded-lg p-2.5 transition-all duration-200 hover:bg-blue-50/60 dark:hover:bg-blue-950/40 hover:border-blue-300/60 dark:hover:border-blue-700/60 hover:shadow-sm border border-sidebar-border/40 bg-sidebar/30",
                isActive &&
                  "bg-blue-100 dark:bg-blue-900/50 border-blue-400 dark:border-blue-600 shadow-md ring-1 ring-blue-200/50 dark:ring-blue-700/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 hover:border-blue-400 dark:hover:border-blue-600",
              )}
            >
              {/* Delete button - shown on hover */}
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={(e) => handleDeleteClick(e, session.id, title)}
              >
                <TrashIcon className="w-3 h-3" />
              </Button>
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
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-sidebar-foreground/70">
                    <div className="flex items-center gap-1">
                      <MessageSquareIcon className="w-3 h-3" />
                      <span>{session.meta.messageCount}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CoinsIcon className="w-3 h-3" />
                      <span>${session.meta.cost.totalUsd.toFixed(2)}</span>
                    </div>
                  </div>
                  {session.lastModifiedAt && (
                    <span className="text-xs text-sidebar-foreground/60">
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
        {hasNextPage && fetchNextPage && (
          <div className="p-2">
            <Button
              onClick={() => fetchNextPage()}
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

      {/* Delete Session Dialog */}
      {deletingSession !== null && (
        <DeleteSessionDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          projectId={projectId}
          sessionId={deletingSession.id}
          sessionTitle={deletingSession.title}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </div>
  );
};
