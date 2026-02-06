import { Trans } from "@lingui/react";
import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useAtomValue } from "jotai";
import {
  CoinsIcon,
  CopyIcon,
  DownloadIcon,
  EllipsisVertical as EllipsisVerticalIcon,
  GitBranchIcon,
  LoaderIcon,
  MenuIcon,
  MessageSquareIcon,
  PauseIcon,
  TrashIcon,
} from "lucide-react";
import {
  type FC,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { useConfig } from "@/app/hooks/useConfig";
import { PermissionDialog } from "@/components/PermissionDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { usePermissionRequests } from "@/hooks/usePermissionRequests";
import { useSchedulerJobs } from "@/hooks/useScheduler";
import { useTaskNotifications } from "@/hooks/useTaskNotifications";
import { honoClient } from "@/lib/api/client";
import { formatLocaleDate } from "@/lib/date/formatLocaleDate";
import { cn } from "@/lib/utils";
import { useProject } from "../../../hooks/useProject";
import { firstUserMessageToTitle } from "../../../services/firstCommandToTitle";
import { useExportSession } from "../hooks/useExportSession";
import { useGitCurrentRevisions } from "../hooks/useGit";
import { useSession } from "../hooks/useSession";
import { useSessionProcess } from "../hooks/useSessionProcess";
import { sessionProcessesAtom } from "../store/sessionProcessesAtom";
import { ConversationList } from "./conversationList/ConversationList";
import { ChatActionMenu } from "./resumeChat/ChatActionMenu";
import { ContinueChat } from "./resumeChat/ContinueChat";
import { ResumeChat } from "./resumeChat/ResumeChat";
import { StartNewChat } from "./resumeChat/StartNewChat";
import { DeleteSessionDialog } from "./sessionSidebar/DeleteSessionDialog";

type SessionPageMainProps = {
  projectId: string;
  sessionId?: string;
  setIsMobileSidebarOpen: (open: boolean) => void;
  projectPath?: string;
  projectName: string;
};

type SessionData = ReturnType<typeof useSession>;

export const SessionPageMain: FC<SessionPageMainProps> = (props) => {
  if (!props.sessionId) {
    return <SessionPageMainContent {...props} sessionData={null} />;
  }

  return <SessionPageMainWithData {...props} sessionId={props.sessionId} />;
};

const SessionPageMainWithData: FC<
  SessionPageMainProps & { sessionId: string }
> = (props) => {
  const sessionData = useSession(props.projectId, props.sessionId);
  return (
    <SessionPageMainContent
      {...props}
      sessionId={props.sessionId}
      sessionData={sessionData}
    />
  );
};

const SessionPageMainContent: FC<
  SessionPageMainProps & {
    sessionId?: string;
    sessionData: SessionData | null;
  }
> = ({
  projectId,
  sessionId,
  setIsMobileSidebarOpen,
  projectPath,
  projectName,
  sessionData,
}) => {
  const navigate = useNavigate();
  const conversations = sessionData?.conversations ?? [];
  const emptyToolResult: SessionData["getToolResult"] = () => undefined;
  const getToolResult = sessionData?.getToolResult ?? emptyToolResult;
  const isExistingSession =
    Boolean(sessionId) && sessionData !== null && sessionData !== undefined;
  const { currentPermissionRequest, isDialogOpen, onPermissionResponse } =
    usePermissionRequests();
  const { data: revisionsData } = useGitCurrentRevisions(projectId);
  const currentBranch = revisionsData?.success
    ? revisionsData.data.currentBranch?.name
    : undefined;
  const exportSession = useExportSession();
  const { data: allSchedulerJobs } = useSchedulerJobs();
  const { data: projectData } = useProject(projectId);
  const sessionProcesses = useAtomValue(sessionProcessesAtom);
  const { config } = useConfig();
  const sessions = projectData.pages.flatMap((page) => page.sessions);

  const sortedSessions = useMemo(
    () =>
      [...sessions].sort((a, b) => {
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

        const aTime = a.lastModifiedAt
          ? new Date(a.lastModifiedAt).getTime()
          : 0;
        const bTime = b.lastModifiedAt
          ? new Date(b.lastModifiedAt).getTime()
          : 0;
        return bTime - aTime;
      }),
    [sessions, sessionProcesses],
  );

  const sessionProcess = useSessionProcess();
  const relatedSessionProcess = useMemo(() => {
    if (!sessionId) return undefined;
    return sessionProcess.getSessionProcess(sessionId);
  }, [sessionProcess, sessionId]);

  useTaskNotifications(relatedSessionProcess?.status === "running");

  // Filter scheduler jobs related to this session
  const sessionScheduledJobs = useMemo(() => {
    if (!sessionId || !allSchedulerJobs) return [];
    return allSchedulerJobs.filter(
      (job) =>
        job.message.baseSession?.sessionId === sessionId &&
        job.message.projectId === projectId &&
        job.schedule.type === "reserved" &&
        job.lastRunStatus === null, // Only show jobs that haven't been executed yet
    );
  }, [allSchedulerJobs, sessionId, projectId]);

  const [previousConversationLength, setPreviousConversationLength] =
    useState(0);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const abortTask = useMutation({
    mutationFn: async (sessionProcessId: string) => {
      const response = await honoClient.api.cc["session-processes"][
        ":sessionProcessId"
      ].abort.$post({
        param: { sessionProcessId },
        json: { projectId },
      });

      if (!response.ok) {
        throw new Error(response.statusText);
      }

      return response.json();
    },
  });

  useEffect(() => {
    if (!isExistingSession) return;
    if (
      relatedSessionProcess?.status === "running" &&
      conversations.length !== previousConversationLength
    ) {
      setPreviousConversationLength(conversations.length);
      const scrollContainer = scrollContainerRef.current;
      if (scrollContainer) {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: "smooth",
        });
      }
    }
  }, [
    conversations,
    isExistingSession,
    relatedSessionProcess?.status,
    previousConversationLength,
  ]);

  const handleScrollToTop = () => {
    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  };

  const handleScrollToBottom = () => {
    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.scrollTo({
        top: scrollContainer.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  const sessionTitle =
    sessionData?.session.meta.firstUserMessage != null
      ? firstUserMessageToTitle(sessionData.session.meta.firstUserMessage)
      : (sessionId ?? "");

  const handleExportJsonl = () => {
    if (!sessionData || !sessionId) return;

    const safeSessionId =
      sessionId.replace(/[^a-zA-Z0-9._-]/g, "_") || "unknown";
    const jsonl = sessionData.conversations
      .map((conversation) => {
        if (conversation.type === "x-error") {
          return conversation.line;
        }

        return JSON.stringify(conversation);
      })
      .join("\n");

    const file = new File([jsonl], `ccv-jsonl-export-${safeSessionId}.jsonl`, {
      type: "application/x-ndjson",
    });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name;
    link.rel = "noopener";
    link.target = "_self";
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      link.remove();
    }, 1000);
  };

  const handleCopySessionFilePath = async () => {
    const sessionFilePath = sessionData?.session.jsonlFilePath;
    if (!sessionFilePath) return;

    try {
      await navigator.clipboard.writeText(sessionFilePath);
      toast.success("Session file path copied");
    } catch (error) {
      console.error("Failed to copy session file path:", error);
      toast.error("Failed to copy session file path");
    }
  };

  let headerTitle: ReactNode = projectName ?? projectId;
  if (!isExistingSession) {
    headerTitle = <Trans id="chat.modal.title" />;
  } else if (sessionData && sessionId) {
    headerTitle = sessionTitle;
  }

  return (
    <>
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        {/* Simplified Chat Header */}
        <header className="px-2 sm:px-3 py-1.5 sm:py-2 sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 w-full flex-shrink-0 min-w-0 border-b border-border/40">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden flex-shrink-0 h-7 w-7 p-0"
                onClick={() => setIsMobileSidebarOpen(true)}
                data-testid="mobile-sidebar-toggle-button"
              >
                <MenuIcon className="w-4 h-4" />
              </Button>
              {isExistingSession && sessionId && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-shrink-0 h-7 w-7 p-0"
                      aria-label="Open session menu"
                    >
                      <EllipsisVerticalIcon className="w-4 h-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80" align="start">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          Actions
                        </p>
                        <div className="grid gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="justify-start"
                            onClick={() =>
                              exportSession.mutate({ projectId, sessionId })
                            }
                            disabled={exportSession.isPending}
                          >
                            <DownloadIcon
                              className={`w-4 h-4 mr-2 ${exportSession.isPending ? "animate-pulse" : ""}`}
                            />
                            <Trans id="session.menu.export_html" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="justify-start"
                            onClick={handleExportJsonl}
                          >
                            <DownloadIcon className="w-4 h-4 mr-2" />
                            <Trans id="session.menu.export_jsonl" />
                          </Button>
                          {sessionData?.session.jsonlFilePath && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="justify-start"
                              onClick={handleCopySessionFilePath}
                            >
                              <CopyIcon className="w-4 h-4 mr-2" />
                              <Trans id="session.menu.copy_session_path" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="justify-start text-destructive hover:text-destructive"
                            onClick={() => setIsDeleteDialogOpen(true)}
                          >
                            <TrashIcon className="w-4 h-4 mr-2" />
                            <Trans id="session.delete_dialog.title" />
                          </Button>
                        </div>
                      </div>
                      <div className="h-px bg-border/60" />
                      <div>
                        <h3 className="font-semibold text-sm mb-2">
                          <Trans id="control.metadata" />
                        </h3>
                        <div className="space-y-2">
                          {projectPath && (
                            <div className="flex flex-col gap-1">
                              <span className="text-xs text-muted-foreground">
                                <Trans id="control.project_path" />
                              </span>
                              <Badge
                                variant="secondary"
                                className="h-7 text-xs flex items-center w-fit break-all"
                              >
                                {projectPath}
                              </Badge>
                            </div>
                          )}
                          {currentBranch && (
                            <div className="flex flex-col gap-1">
                              <span className="text-xs text-muted-foreground">
                                <Trans id="control.branch" />
                              </span>
                              <Badge
                                variant="secondary"
                                className="h-7 text-xs flex items-center gap-1 w-fit"
                              >
                                <GitBranchIcon className="w-3 h-3" />
                                {currentBranch}
                              </Badge>
                            </div>
                          )}
                          {sessionId && isExistingSession && (
                            <div className="flex flex-col gap-1">
                              <span className="text-xs text-muted-foreground">
                                <Trans id="control.session_id" />
                              </span>
                              <Badge
                                variant="secondary"
                                className="h-7 text-xs flex items-center w-fit font-mono break-all"
                              >
                                {sessionId}
                              </Badge>
                            </div>
                          )}
                          {isExistingSession && sessionData && (
                            <div className="flex flex-col gap-1">
                              <span className="text-xs text-muted-foreground">
                                <Trans id="control.model" />
                              </span>
                              <Badge
                                variant="secondary"
                                className="h-7 text-xs flex items-center w-fit font-mono"
                              >
                                {sessionData.session.meta.modelName ??
                                  "Unknown"}
                              </Badge>
                            </div>
                          )}
                          {isExistingSession && sessionData && (
                            <div className="flex flex-col gap-1">
                              <span className="text-xs text-muted-foreground">
                                <Trans id="session.cost.label" />
                              </span>
                              <div className="space-y-1.5">
                                <Badge
                                  variant="secondary"
                                  className="h-7 text-xs flex items-center w-fit font-semibold"
                                >
                                  <Trans id="session.cost.total" />: $
                                  {sessionData.session.meta.cost.totalUsd.toFixed(
                                    3,
                                  )}
                                </Badge>
                                <div className="text-xs space-y-1 pl-2">
                                  <div className="flex justify-between gap-4">
                                    <span className="text-muted-foreground">
                                      <Trans id="session.cost.input_tokens" />:
                                    </span>
                                    <span>
                                      $
                                      {sessionData.session.meta.cost.breakdown.inputTokensUsd.toFixed(
                                        3,
                                      )}{" "}
                                      (
                                      {sessionData.session.meta.cost.tokenUsage.inputTokens.toLocaleString()}
                                      )
                                    </span>
                                  </div>
                                  <div className="flex justify-between gap-4">
                                    <span className="text-muted-foreground">
                                      <Trans id="session.cost.output_tokens" />:
                                    </span>
                                    <span>
                                      $
                                      {sessionData.session.meta.cost.breakdown.outputTokensUsd.toFixed(
                                        3,
                                      )}{" "}
                                      (
                                      {sessionData.session.meta.cost.tokenUsage.outputTokens.toLocaleString()}
                                      )
                                    </span>
                                  </div>
                                  <div className="flex justify-between gap-4">
                                    <span className="text-muted-foreground">
                                      <Trans id="session.cost.cache_creation" />
                                      :
                                    </span>
                                    <span>
                                      $
                                      {sessionData.session.meta.cost.breakdown.cacheCreationUsd.toFixed(
                                        3,
                                      )}{" "}
                                      (
                                      {sessionData.session.meta.cost.tokenUsage.cacheCreationTokens.toLocaleString()}
                                      )
                                    </span>
                                  </div>
                                  <div className="flex justify-between gap-4">
                                    <span className="text-muted-foreground">
                                      <Trans id="session.cost.cache_read" />:
                                    </span>
                                    <span>
                                      $
                                      {sessionData.session.meta.cost.breakdown.cacheReadUsd.toFixed(
                                        3,
                                      )}{" "}
                                      (
                                      {sessionData.session.meta.cost.tokenUsage.cacheReadTokens.toLocaleString()}
                                      )
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
              <h1 className="text-sm sm:text-base font-semibold break-all overflow-ellipsis line-clamp-1 min-w-0 text-foreground/90">
                {headerTitle}
              </h1>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {relatedSessionProcess?.status === "running" && (
                <Badge
                  variant="secondary"
                  className="bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20 h-5 text-[10px] px-1.5"
                >
                  <LoaderIcon className="w-2.5 h-2.5 mr-0.5 animate-spin" />
                  <Trans id="session.conversation.running" />
                </Badge>
              )}
              {relatedSessionProcess?.status === "paused" && (
                <Badge
                  variant="secondary"
                  className="bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20 h-5 text-[10px] px-1.5"
                >
                  <PauseIcon className="w-2.5 h-2.5 mr-0.5" />
                  <Trans id="session.conversation.paused" />
                </Badge>
              )}
            </div>
          </div>
        </header>

        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto min-h-0 min-w-0"
          data-testid="scrollable-content"
        >
          <main className="w-full px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 relative min-w-0 pb-4">
            <ConversationList
              conversations={isExistingSession ? conversations : []}
              getToolResult={getToolResult}
              projectId={projectId}
              sessionId={sessionId ?? ""}
              scheduledJobs={sessionScheduledJobs}
            />
            {!isExistingSession && (
              <div className="space-y-6">
                <div className="rounded-2xl border border-dashed border-muted-foreground/40 bg-muted/30 p-8 text-center space-y-3">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-background shadow-sm">
                    <MessageSquareIcon className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-base font-semibold">
                      <Trans id="chat.modal.title" />
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      <Trans id="session.empty_state.description" />
                    </p>
                  </div>
                </div>

                {/* Recent Sessions List */}
                {sortedSessions.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground">
                      <Trans id="chat.history.title" />
                    </h3>
                    <div className="grid gap-2">
                      {sortedSessions.slice(0, 3).map((session) => {
                        const title =
                          session.meta.firstUserMessage !== null
                            ? firstUserMessageToTitle(
                                session.meta.firstUserMessage,
                              )
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
                            search={{ sessionId: session.id }}
                            className={cn(
                              "block p-3 rounded-lg transition-colors border",
                              "border-border/40 hover:bg-muted/50 hover:border-primary/30",
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
                                <span>
                                  ${session.meta.cost.totalUsd.toFixed(2)}
                                </span>
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
                    </div>
                  </div>
                )}
              </div>
            )}
            {isExistingSession &&
              relatedSessionProcess?.status === "running" && (
                <div className="flex justify-start items-center py-8 animate-in fade-in duration-500">
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                      <LoaderIcon className="w-8 h-8 animate-spin text-primary" />
                      <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                    </div>
                    <p className="text-sm text-muted-foreground font-medium animate-pulse">
                      <Trans id="session.processing" />
                    </p>
                  </div>
                </div>
              )}
          </main>
        </div>

        <div className="w-full pt-3">
          <ChatActionMenu
            projectId={projectId}
            sessionId={sessionId}
            onScrollToTop={handleScrollToTop}
            onScrollToBottom={handleScrollToBottom}
            sessionProcess={relatedSessionProcess}
            abortTask={abortTask}
            isNewChat={!isExistingSession}
          />
        </div>

        <div className="flex-shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          {isExistingSession && sessionId && relatedSessionProcess ? (
            <ContinueChat
              projectId={projectId}
              sessionId={sessionId}
              sessionProcessId={relatedSessionProcess.id}
              sessionProcessStatus={relatedSessionProcess.status}
            />
          ) : isExistingSession && sessionId ? (
            <ResumeChat projectId={projectId} sessionId={sessionId} />
          ) : (
            <StartNewChat projectId={projectId} />
          )}
        </div>
      </div>

      {isExistingSession && sessionId && (
        <DeleteSessionDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          projectId={projectId}
          sessionId={sessionId}
          sessionTitle={sessionTitle}
          onSuccess={() => {
            navigate({
              to: "/projects/$projectId/session",
              params: { projectId },
              search: { sessionId: undefined, tab: "sessions" },
            });
          }}
        />
      )}

      <PermissionDialog
        permissionRequest={currentPermissionRequest}
        isOpen={isDialogOpen}
        onResponse={onPermissionResponse}
      />
    </>
  );
};
