import { Trans } from "@lingui/react";
import { useMutation } from "@tanstack/react-query";
import {
  DownloadIcon,
  GitBranchIcon,
  InfoIcon,
  LoaderIcon,
  MenuIcon,
  MessageSquareIcon,
  PauseIcon,
} from "lucide-react";
import {
  type FC,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { PermissionDialog } from "@/components/PermissionDialog";
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
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePermissionRequests } from "@/hooks/usePermissionRequests";
import { useSchedulerJobs } from "@/hooks/useScheduler";
import { useTaskNotifications } from "@/hooks/useTaskNotifications";
import { honoClient } from "@/lib/api/client";
import { firstUserMessageToTitle } from "../../../services/firstCommandToTitle";
import { useExportSession } from "../hooks/useExportSession";
import type { useGitCurrentRevisions } from "../hooks/useGit";
import { useGitCurrentRevisions as useGitCurrentRevisionsHook } from "../hooks/useGit";
import { useSession } from "../hooks/useSession";
import { useSessionProcess } from "../hooks/useSessionProcess";
import { ConversationList } from "./conversationList/ConversationList";
import { DiffModal } from "./diffModal";
import { ChatActionMenu } from "./resumeChat/ChatActionMenu";
import { ContinueChat } from "./resumeChat/ContinueChat";
import { ResumeChat } from "./resumeChat/ResumeChat";
import { StartNewChat } from "./resumeChat/StartNewChat";

type SessionPageMainProps = {
  projectId: string;
  sessionId?: string;
  setIsMobileSidebarOpen: (open: boolean) => void;
  projectPath?: string;
  currentBranch?: string;
  revisionsData?: ReturnType<typeof useGitCurrentRevisions>["data"];
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
  currentBranch,
  revisionsData: revisionsDataProp,
  projectName,
  sessionData,
}) => {
  const conversations = sessionData?.conversations ?? [];
  const emptyToolResult: SessionData["getToolResult"] = () => undefined;
  const getToolResult = sessionData?.getToolResult ?? emptyToolResult;
  const isExistingSession =
    Boolean(sessionId) && sessionData !== null && sessionData !== undefined;
  const { currentPermissionRequest, isDialogOpen, onPermissionResponse } =
    usePermissionRequests();
  const { data: revisionsDataFallback } = useGitCurrentRevisionsHook(projectId);
  const revisionsData = revisionsDataProp ?? revisionsDataFallback;
  const exportSession = useExportSession();
  const { data: allSchedulerJobs } = useSchedulerJobs();

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
        job.message.baseSessionId === sessionId &&
        job.message.projectId === projectId &&
        job.schedule.type === "reserved" &&
        job.lastRunStatus === null, // Only show jobs that haven't been executed yet
    );
  }, [allSchedulerJobs, sessionId, projectId]);

  const [previousConversationLength, setPreviousConversationLength] =
    useState(0);
  const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);
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

  let headerTitle: ReactNode = projectName ?? projectId;
  if (!isExistingSession) {
    headerTitle = <Trans id="chat.modal.title" />;
  } else if (sessionData && sessionId) {
    headerTitle =
      sessionData.session.meta.firstUserMessage !== null
        ? firstUserMessageToTitle(sessionData.session.meta.firstUserMessage)
        : sessionId;
  }

  return (
    <>
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        <header className="px-2 sm:px-3 py-2 sm:py-3 sticky top-0 z-10 bg-background w-full flex-shrink-0 min-w-0 border-b space-y-1">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden flex-shrink-0"
              onClick={() => setIsMobileSidebarOpen(true)}
              data-testid="mobile-sidebar-toggle-button"
            >
              <MenuIcon className="w-4 h-4" />
            </Button>
            <h1 className="text-lg sm:text-2xl md:text-3xl font-bold break-all overflow-ellipsis line-clamp-1 min-w-0">
              {headerTitle}
            </h1>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0 overflow-hidden flex-1">
              {projectPath && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="secondary"
                      className="h-6 text-xs flex items-center max-w-full cursor-help"
                    >
                      <span className="truncate">
                        {projectPath.split("/").pop()}
                      </span>
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>{projectPath}</TooltipContent>
                </Tooltip>
              )}
              {currentBranch && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="secondary"
                      className="h-6 text-xs flex items-center gap-1 max-w-full cursor-help"
                    >
                      <GitBranchIcon className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{currentBranch}</span>
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <Trans id="control.branch" />
                  </TooltipContent>
                </Tooltip>
              )}
              {isExistingSession && sessionId && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="secondary"
                      className="h-6 text-xs flex items-center max-w-full font-mono cursor-help"
                    >
                      <span className="truncate">{sessionId}</span>
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <Trans id="control.session_id" />
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            {relatedSessionProcess?.status === "running" && (
              <Badge
                variant="secondary"
                className="bg-green-500/10 text-green-900 dark:text-green-200 border-green-500/20 flex-shrink-0 h-6 text-xs"
              >
                <LoaderIcon className="w-3 h-3 mr-1 animate-spin" />
                <Trans id="session.conversation.running" />
              </Badge>
            )}
            {relatedSessionProcess?.status === "paused" && (
              <Badge
                variant="secondary"
                className="bg-orange-500/10 text-orange-900 dark:text-orange-200 border-orange-500/20 flex-shrink-0 h-6 text-xs"
              >
                <PauseIcon className="w-3 h-3 mr-1" />
                <Trans id="session.conversation.paused" />
              </Badge>
            )}
            {sessionId !== undefined && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="flex-shrink-0 h-6 w-6"
                    onClick={() =>
                      exportSession.mutate({ projectId, sessionId })
                    }
                    disabled={exportSession.isPending}
                    aria-label="Export session to HTML"
                  >
                    <DownloadIcon
                      className={`w-3.5 h-3.5 ${exportSession.isPending ? "animate-pulse" : ""}`}
                    />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Export to HTML</TooltipContent>
              </Tooltip>
            )}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="flex-shrink-0 h-6 w-6"
                  aria-label="Session metadata"
                >
                  <InfoIcon className="w-3.5 h-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-4">
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
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge
                                variant="secondary"
                                className="h-7 text-xs flex items-center w-fit cursor-help"
                              >
                                {projectPath.split("/").pop()}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>{projectPath}</TooltipContent>
                          </Tooltip>
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
                            className="h-7 text-xs flex items-center w-fit font-mono"
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
                            {sessionData.session.meta.modelName ?? "Unknown"}
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
                                  <Trans id="session.cost.cache_creation" />:
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
            onScrollToTop={handleScrollToTop}
            onScrollToBottom={handleScrollToBottom}
            onOpenDiffModal={
              isExistingSession ? () => setIsDiffModalOpen(true) : undefined
            }
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

      {isExistingSession && (
        <DiffModal
          projectId={projectId}
          isOpen={isDiffModalOpen}
          onOpenChange={setIsDiffModalOpen}
          revisionsData={revisionsData}
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
