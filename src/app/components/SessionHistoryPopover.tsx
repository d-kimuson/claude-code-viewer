import { Trans } from "@lingui/react";
import { Link } from "@tanstack/react-router";
import { useAtomValue } from "jotai";
import {
  CoinsIcon,
  HistoryIcon,
  MessageSquareIcon,
  PlusIcon,
} from "lucide-react";
import type { FC } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatLocaleDate } from "../../lib/date/formatLocaleDate";
import { useConfig } from "../hooks/useConfig";
import { useProject } from "../projects/[projectId]/hooks/useProject";
import { firstUserMessageToTitle } from "../projects/[projectId]/services/firstCommandToTitle";
import type { Tab } from "../projects/[projectId]/sessions/[sessionId]/components/sessionSidebar/schema";
import { sessionProcessesAtom } from "../projects/[projectId]/sessions/[sessionId]/store/sessionProcessesAtom";

interface SessionHistoryPopoverProps {
  projectId: string;
  currentSessionId?: string;
  currentTab?: Tab;
  /** Trigger button variant: "icon" (default) or "menu" (with label, for action menu) */
  variant?: "icon" | "menu";
}

export const SessionHistoryPopover: FC<SessionHistoryPopoverProps> = ({
  projectId,
  currentSessionId,
  currentTab = "sessions",
  variant = "icon",
}) => {
  const {
    data: projectData,
    fetchNextPage,
    hasNextPage,
  } = useProject(projectId);
  const sessions = projectData.pages.flatMap((page) => page.sessions);
  const sessionProcesses = useAtomValue(sessionProcessesAtom);
  const { config } = useConfig();

  const sortedSessions = [...sessions].sort((a, b) => {
    const aProcess = sessionProcesses.find(
      (process) => process.sessionId === a.id,
    );
    const bProcess = sessionProcesses.find(
      (process) => process.sessionId === b.id,
    );

    const aStatus = aProcess?.status;
    const bStatus = bProcess?.status;

    const getPriority = (status: "paused" | "running" | undefined) => {
      if (status === "running") return 0;
      if (status === "paused") return 1;
      return 2;
    };

    const aPriority = getPriority(aStatus);
    const bPriority = getPriority(bStatus);

    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }

    const aTime = a.lastModifiedAt ? new Date(a.lastModifiedAt).getTime() : 0;
    const bTime = b.lastModifiedAt ? new Date(b.lastModifiedAt).getTime() : 0;
    return bTime - aTime;
  });

  const isNewChatActive = !currentSessionId;

  const triggerButton =
    variant === "menu" ? (
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 gap-1.5 text-xs bg-muted/20 rounded-lg border border-border/40"
        >
          <HistoryIcon className="w-3.5 h-3.5" />
          <span>
            <Trans id="chat.history.button" />
          </span>
        </Button>
      </PopoverTrigger>
    ) : (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
              >
                <HistoryIcon className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            <Trans id="chat.history.button" />
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );

  return (
    <Popover>
      {triggerButton}

      <PopoverContent
        className="w-80 p-0"
        align="start"
        side="bottom"
        sideOffset={8}
      >
        <div className="border-b border-border/60 px-3 py-2">
          <h3 className="text-sm font-semibold">
            <Trans id="chat.history.title" />
          </h3>
          <p className="text-xs text-muted-foreground">
            {sessions.length} <Trans id="sessions.total" />
          </p>
        </div>

        <div className="h-[300px] overflow-y-auto">
          <div className="p-2 space-y-1">
            {/* New Chat Option */}
            <Link
              to="/projects/$projectId/session"
              params={{ projectId }}
              search={{ tab: currentTab }}
              className={cn(
                "flex items-center gap-3 p-2 rounded-md transition-colors border border-dashed",
                isNewChatActive
                  ? "bg-primary/10 border-primary/40"
                  : "border-border/60 hover:bg-muted/50 hover:border-primary/30",
              )}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary flex-shrink-0">
                <PlusIcon className="w-3.5 h-3.5" />
              </div>
              <span className="text-sm font-medium">
                <Trans id="chat.modal.title" />
              </span>
            </Link>

            {/* Session List */}
            {sortedSessions.slice(0, 20).map((session) => {
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
                    "block p-2 rounded-md transition-colors border",
                    isActive
                      ? "bg-primary/10 border-primary/40"
                      : "border-transparent hover:bg-muted/50",
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="text-sm font-medium line-clamp-1 flex-1">
                      {title}
                    </h4>
                    {(isRunning || isPaused) && (
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[10px] px-1.5 h-4 shrink-0",
                          isRunning &&
                            "bg-green-500/10 text-green-600 dark:text-green-400",
                          isPaused &&
                            "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
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
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <MessageSquareIcon className="w-2.5 h-2.5" />
                      <span>{session.meta.messageCount}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CoinsIcon className="w-2.5 h-2.5" />
                      <span>${session.meta.cost.totalUsd.toFixed(2)}</span>
                    </div>
                    {session.lastModifiedAt && (
                      <span>
                        {formatLocaleDate(session.lastModifiedAt, {
                          locale: config.locale,
                          target: "time",
                        })}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}

            {/* Load More */}
            {hasNextPage && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs h-8"
                onClick={() => fetchNextPage()}
              >
                <Trans id="sessions.load.more" />
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
