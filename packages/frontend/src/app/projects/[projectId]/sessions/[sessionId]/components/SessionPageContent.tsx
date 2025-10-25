import { Trans } from "@lingui/react";
import { useMutation } from "@tanstack/react-query";
import {
  GitCompareIcon,
  LoaderIcon,
  MenuIcon,
  PauseIcon,
  XIcon,
} from "lucide-react";
import type { FC } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { PermissionDialog } from "@/components/PermissionDialog";
import { Button } from "@/components/ui/button";
import { usePermissionRequests } from "@/hooks/usePermissionRequests";
import { useTaskNotifications } from "@/hooks/useTaskNotifications";
import { Badge } from "../../../../../../components/ui/badge";
import { honoClient } from "../../../../../../lib/api/client";
import { useProject } from "../../../hooks/useProject";
import { firstUserMessageToTitle } from "../../../services/firstCommandToTitle";
import { useSession } from "../hooks/useSession";
import { useSessionProcess } from "../hooks/useSessionProcess";
import { ConversationList } from "./conversationList/ConversationList";
import { DiffModal } from "./diffModal";
import { ContinueChat } from "./resumeChat/ContinueChat";
import { ResumeChat } from "./resumeChat/ResumeChat";
import { SessionSidebar } from "./sessionSidebar/SessionSidebar";

export const SessionPageContent: FC<{
  projectId: string;
  sessionId: string;
}> = ({ projectId, sessionId }) => {
  const { session, conversations, getToolResult } = useSession(
    projectId,
    sessionId,
  );
  const { data: projectData } = useProject(projectId);
  // biome-ignore lint/style/noNonNullAssertion: useSuspenseInfiniteQuery guarantees at least one page
  const project = projectData.pages[0]!.project;

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
  const sessionProcess = useSessionProcess();

  const { currentPermissionRequest, isDialogOpen, onPermissionResponse } =
    usePermissionRequests();

  const relatedSessionProcess = useMemo(
    () => sessionProcess.getSessionProcess(sessionId),
    [sessionProcess, sessionId],
  );

  // Set up task completion notifications
  useTaskNotifications(relatedSessionProcess?.status === "running");

  const [previousConversationLength, setPreviousConversationLength] =
    useState(0);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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
  ]);

  return (
    <>
      <SessionSidebar
        currentSessionId={sessionId}
        projectId={projectId}
        isMobileOpen={isMobileSidebarOpen}
        onMobileOpenChange={setIsMobileSidebarOpen}
      />

      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        <header className="px-2 sm:px-3 py-2 sm:py-3 sticky top-0 z-10 bg-background w-full flex-shrink-0 min-w-0">
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden flex-shrink-0"
                onClick={() => setIsMobileSidebarOpen(true)}
                data-testid="mobile-sidebar-toggle-button"
              >
                <MenuIcon className="w-4 h-4" />
              </Button>
              <h1 className="text-lg sm:text-2xl md:text-3xl font-bold break-all overflow-ellipsis line-clamp-1 px-1 sm:px-5 min-w-0">
                {session.meta.firstUserMessage !== null
                  ? firstUserMessageToTitle(session.meta.firstUserMessage)
                  : sessionId}
              </h1>
            </div>

            <div className="px-1 sm:px-5 flex flex-wrap items-center gap-1 sm:gap-2">
              {project?.claudeProjectPath && (
                <Badge
                  variant="secondary"
                  className="h-6 sm:h-8 text-xs sm:text-sm flex items-center"
                >
                  {project.meta.projectPath ?? project.claudeProjectPath}
                </Badge>
              )}
              <Badge
                variant="secondary"
                className="h-6 sm:h-8 text-xs sm:text-sm flex items-center"
              >
                {sessionId}
              </Badge>
            </div>

            {relatedSessionProcess?.status === "running" && (
              <div className="flex items-center gap-1 sm:gap-2 p-1 bg-primary/10 border border-primary/20 rounded-lg mx-1 sm:mx-5 animate-in fade-in slide-in-from-top-2 duration-300">
                <LoaderIcon className="w-3 h-3 sm:w-4 sm:h-4 animate-spin text-primary" />
                <div className="flex-1">
                  <p className="text-xs sm:text-sm font-medium">
                    <Trans
                      id="session.conversation.in.progress"
                      message="Conversation is in progress..."
                    />
                  </p>
                  <div className="w-full bg-primary/10 rounded-full h-1 mt-1 overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full animate-pulse"
                      style={{ width: "70%" }}
                    />
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    abortTask.mutate(relatedSessionProcess.id);
                  }}
                  disabled={abortTask.isPending}
                >
                  {abortTask.isPending ? (
                    <LoaderIcon className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                  ) : (
                    <XIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                  )}
                  <span className="hidden sm:inline">
                    <Trans id="session.conversation.abort" message="Abort" />
                  </span>
                </Button>
              </div>
            )}

            {relatedSessionProcess?.status === "paused" && (
              <div className="flex items-center gap-1 sm:gap-2 p-1 bg-orange-50/80 dark:bg-orange-950/50 border border-orange-300/50 dark:border-orange-800/50 rounded-lg mx-1 sm:mx-5 animate-in fade-in slide-in-from-top-2 duration-300">
                <PauseIcon className="w-3 h-3 sm:w-4 sm:h-4 text-orange-600 dark:text-orange-400 animate-pulse" />
                <div className="flex-1">
                  <p className="text-xs sm:text-sm font-medium text-orange-900 dark:text-orange-200">
                    <Trans
                      id="session.conversation.paused"
                      message="Conversation is paused..."
                    />
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    abortTask.mutate(relatedSessionProcess.id);
                  }}
                  disabled={abortTask.isPending}
                  className="hover:bg-orange-100 dark:hover:bg-orange-900/50 text-orange-900 dark:text-orange-200"
                >
                  {abortTask.isPending ? (
                    <LoaderIcon className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                  ) : (
                    <XIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                  )}
                  <span className="hidden sm:inline">
                    <Trans id="session.conversation.abort" message="Abort" />
                  </span>
                </Button>
              </div>
            )}
          </div>
        </header>

        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto min-h-0 min-w-0"
          data-testid="scrollable-content"
        >
          <main className="w-full px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 relative z-5 min-w-0">
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

            {relatedSessionProcess !== undefined ? (
              <ContinueChat
                projectId={projectId}
                sessionId={sessionId}
                sessionProcessId={relatedSessionProcess.id}
              />
            ) : (
              <ResumeChat projectId={projectId} sessionId={sessionId} />
            )}
          </main>
        </div>
      </div>

      {/* Fixed Diff Button */}
      <Button
        onClick={() => setIsDiffModalOpen(true)}
        className="fixed bottom-15 right-6 w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 z-50"
        size="lg"
      >
        <GitCompareIcon className="w-6 h-6" />
      </Button>

      {/* Diff Modal */}
      <DiffModal
        projectId={projectId}
        isOpen={isDiffModalOpen}
        onOpenChange={setIsDiffModalOpen}
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
