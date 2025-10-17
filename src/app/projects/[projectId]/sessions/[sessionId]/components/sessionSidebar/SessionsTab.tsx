"use client";

import { useAtomValue } from "jotai";
import { MessageSquareIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import type { FC } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Session } from "../../../../../../../server/service/types";
import { NewChatModal } from "../../../../components/newChat/NewChatModal";
import { firstCommandToTitle } from "../../../../services/firstCommandToTitle";
import { sessionProcessesAtom } from "../../store/sessionProcessesAtom";

export const SessionsTab: FC<{
  sessions: Session[];
  currentSessionId: string;
  projectId: string;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onLoadMore?: () => void;
}> = ({
  sessions,
  currentSessionId,
  projectId,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}) => {
  const sessionProcesses = useAtomValue(sessionProcessesAtom);

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
    const aTime = a.lastModifiedAt ? a.lastModifiedAt.getTime() : 0;
    const bTime = b.lastModifiedAt ? b.lastModifiedAt.getTime() : 0;
    return bTime - aTime;
  });

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-sidebar-border p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-lg">Sessions</h2>
          <NewChatModal
            projectId={projectId}
            trigger={
              <Button size="sm" variant="outline" className="gap-1.5">
                <PlusIcon className="w-3.5 h-3.5" />
                New
              </Button>
            }
          />
        </div>
        <p className="text-xs text-sidebar-foreground/70">
          {sessions.length} total
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {sortedSessions.map((session) => {
          const isActive = session.id === currentSessionId;
          const title =
            session.meta.firstCommand !== null
              ? firstCommandToTitle(session.meta.firstCommand)
              : session.id;

          const sessionProcess = sessionProcesses.find(
            (task) => task.sessionId === session.id,
          );
          const isRunning = sessionProcess?.status === "running";
          const isPaused = sessionProcess?.status === "paused";

          return (
            <Link
              key={session.id}
              href={`/projects/${projectId}/sessions/${session.id}`}
              className={cn(
                "block rounded-lg p-2.5 transition-all duration-200 hover:bg-blue-50/60 dark:hover:bg-blue-950/40 hover:border-blue-300/60 dark:hover:border-blue-700/60 hover:shadow-sm border border-sidebar-border/40 bg-sidebar/30",
                isActive &&
                  "bg-blue-100 dark:bg-blue-900/50 border-blue-400 dark:border-blue-600 shadow-md ring-1 ring-blue-200/50 dark:ring-blue-700/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 hover:border-blue-400 dark:hover:border-blue-600",
              )}
            >
              <div className="space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-medium line-clamp-2 leading-tight text-sidebar-foreground flex-1">
                    {title}
                  </h3>
                  {(isRunning || isPaused) && (
                    <Badge
                      variant={isRunning ? "default" : "secondary"}
                      className={cn(
                        "text-xs",
                        isRunning && "bg-green-500 text-white",
                        isPaused && "bg-yellow-500 text-white",
                      )}
                    >
                      {isRunning ? "Running" : "Paused"}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs text-sidebar-foreground/70">
                    <MessageSquareIcon className="w-3 h-3" />
                    <span>{session.meta.messageCount}</span>
                  </div>
                  {session.lastModifiedAt && (
                    <span className="text-xs text-sidebar-foreground/60">
                      {new Date(session.lastModifiedAt).toLocaleDateString(
                        "en-US",
                        {
                          month: "short",
                          day: "numeric",
                        },
                      )}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}

        {/* Load More Button */}
        {hasNextPage && onLoadMore && (
          <div className="p-2">
            <Button
              onClick={onLoadMore}
              disabled={isFetchingNextPage}
              variant="outline"
              size="sm"
              className="w-full"
            >
              {isFetchingNextPage ? "Loading..." : "Load More"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
