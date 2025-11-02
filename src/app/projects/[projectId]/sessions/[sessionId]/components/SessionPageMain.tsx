import { Trans } from "@lingui/react";
import type { UseMutationResult } from "@tanstack/react-query";
import {
  GitBranchIcon,
  InfoIcon,
  LoaderIcon,
  MenuIcon,
  PauseIcon,
} from "lucide-react";
import { type FC, type RefObject, useEffect, useMemo, useState } from "react";
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
import { useTaskNotifications } from "@/hooks/useTaskNotifications";
import type { PublicSessionProcess } from "@/types/session-process";
import { firstUserMessageToTitle } from "../../../services/firstCommandToTitle";
import type { useGitCurrentRevisions } from "../hooks/useGit";
import { useGitCurrentRevisions as useGitCurrentRevisionsHook } from "../hooks/useGit";
import { useSession } from "../hooks/useSession";
import { useSessionProcess } from "../hooks/useSessionProcess";
import { ConversationList } from "./conversationList/ConversationList";
import { DiffModal } from "./diffModal";
import { ChatActionMenu } from "./resumeChat/ChatActionMenu";
import { ContinueChat } from "./resumeChat/ContinueChat";
import { ResumeChat } from "./resumeChat/ResumeChat";

export const SessionPageMain: FC<{
  projectId: string;
  sessionId: string;
  setIsMobileSidebarOpen: (open: boolean) => void;
  isDiffModalOpen: boolean;
  setIsDiffModalOpen: (open: boolean) => void;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  onScrollToTop?: () => void;
  onScrollToBottom?: () => void;
  onOpenDiffModal?: () => void;
  abortTask?: UseMutationResult<unknown, Error, string, unknown>;
  projectPath?: string;
  currentBranch?: string;
  sessionProcessStatus?: PublicSessionProcess["status"];
  revisionsData?: ReturnType<typeof useGitCurrentRevisions>["data"];
}> = ({
  projectId,
  sessionId,
  setIsMobileSidebarOpen,
  isDiffModalOpen,
  setIsDiffModalOpen,
  scrollContainerRef,
  onScrollToTop,
  onScrollToBottom,
  onOpenDiffModal,
  abortTask,
  projectPath,
  currentBranch,
  sessionProcessStatus,
  revisionsData: revisionsDataProp,
}) => {
  const { session, conversations, getToolResult } = useSession(
    projectId,
    sessionId,
  );
  const { currentPermissionRequest, isDialogOpen, onPermissionResponse } =
    usePermissionRequests();
  const { data: revisionsDataFallback } = useGitCurrentRevisionsHook(projectId);
  const revisionsData = revisionsDataProp ?? revisionsDataFallback;

  const sessionProcess = useSessionProcess();

  const relatedSessionProcess = useMemo(
    () => sessionProcess.getSessionProcess(sessionId),
    [sessionProcess, sessionId],
  );

  // Set up task completion notifications
  useTaskNotifications(relatedSessionProcess?.status === "running");

  const [previousConversationLength, setPreviousConversationLength] =
    useState(0);

  // 自動スクロール処理
  useEffect(() => {
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
    relatedSessionProcess?.status,
    previousConversationLength,
    scrollContainerRef.current,
  ]);

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
              {session.meta.firstUserMessage !== null
                ? firstUserMessageToTitle(session.meta.firstUserMessage)
                : sessionId}
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
                    <Trans id="control.branch" message="Branch" />
                  </TooltipContent>
                </Tooltip>
              )}
              {sessionId && (
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
                    <Trans id="control.session_id" message="Session ID" />
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            {sessionProcessStatus === "running" && (
              <Badge
                variant="secondary"
                className="bg-green-500/10 text-green-900 dark:text-green-200 border-green-500/20 flex-shrink-0 h-6 text-xs"
              >
                <LoaderIcon className="w-3 h-3 mr-1 animate-spin" />
                <Trans id="session.conversation.running" message="Running" />
              </Badge>
            )}
            {sessionProcessStatus === "paused" && (
              <Badge
                variant="secondary"
                className="bg-orange-500/10 text-orange-900 dark:text-orange-200 border-orange-500/20 flex-shrink-0 h-6 text-xs"
              >
                <PauseIcon className="w-3 h-3 mr-1" />
                <Trans id="session.conversation.paused" message="Paused" />
              </Badge>
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
                      <Trans id="control.metadata" message="Metadata" />
                    </h3>
                    <div className="space-y-2">
                      {projectPath && (
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-muted-foreground">
                            <Trans
                              id="control.project_path"
                              message="Project Path"
                            />
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
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-muted-foreground">
                          <Trans id="control.session_id" message="Session ID" />
                        </span>
                        <Badge
                          variant="secondary"
                          className="h-7 text-xs flex items-center w-fit font-mono"
                        >
                          {sessionId}
                        </Badge>
                      </div>
                      {currentBranch && (
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-muted-foreground">
                            <Trans id="control.branch" message="Branch" />
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
              conversations={conversations}
              getToolResult={getToolResult}
            />

            {relatedSessionProcess?.status === "running" && (
              <div className="flex justify-start items-center py-8 animate-in fade-in duration-500">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <LoaderIcon className="w-8 h-8 animate-spin text-primary" />
                    <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                  </div>
                  <p className="text-sm text-muted-foreground font-medium animate-pulse">
                    <Trans
                      id="session.processing"
                      message="Claude Code is processing..."
                    />
                  </p>
                </div>
              </div>
            )}
          </main>
        </div>

        <div className="w-full pt-3">
          <ChatActionMenu
            projectId={projectId}
            onScrollToTop={onScrollToTop}
            onScrollToBottom={onScrollToBottom}
            onOpenDiffModal={onOpenDiffModal}
            sessionProcess={relatedSessionProcess}
            abortTask={abortTask}
          />
        </div>

        {/* Fixed Chat Form */}
        <div className="flex-shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          {relatedSessionProcess !== undefined ? (
            <ContinueChat
              projectId={projectId}
              sessionId={sessionId}
              sessionProcessId={relatedSessionProcess.id}
              sessionProcessStatus={relatedSessionProcess.status}
            />
          ) : (
            <ResumeChat projectId={projectId} sessionId={sessionId} />
          )}
        </div>
      </div>

      {/* Diff Modal */}
      <DiffModal
        projectId={projectId}
        isOpen={isDiffModalOpen}
        onOpenChange={setIsDiffModalOpen}
        revisionsData={revisionsData}
      />

      {/* Permission Dialog */}
      <PermissionDialog
        permissionRequest={currentPermissionRequest}
        isOpen={isDialogOpen}
        onResponse={onPermissionResponse}
      />
    </>
  );
};
