"use client";

import { useMutation } from "@tanstack/react-query";
import {
  ExternalLinkIcon,
  GitCompareIcon,
  LoaderIcon,
  MenuIcon,
  PauseIcon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import type { FC } from "react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useTaskNotifications } from "@/hooks/useTaskNotifications";
import { Badge } from "../../../../../../components/ui/badge";
import { honoClient } from "../../../../../../lib/api/client";
import { useProject } from "../../../hooks/useProject";
import { firstCommandToTitle } from "../../../services/firstCommandToTitle";
import { useAliveTask } from "../hooks/useAliveTask";
import { useSession } from "../hooks/useSession";
import { ConversationList } from "./conversationList/ConversationList";
import { DiffModal } from "./diffModal";
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
  const { data: project } = useProject(projectId);

  const abortTask = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await honoClient.api.tasks.abort.$post({
        json: { sessionId },
      });

      if (!response.ok) {
        throw new Error(response.statusText);
      }

      return response.json();
    },
  });

  const { isRunningTask, isPausedTask } = useAliveTask(sessionId);

  // Set up task completion notifications
  useTaskNotifications(isRunningTask);

  const [previousConversationLength, setPreviousConversationLength] =
    useState(0);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 自動スクロール処理
  useEffect(() => {
    if (
      (isRunningTask || isPausedTask) &&
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
  }, [conversations, isRunningTask, isPausedTask, previousConversationLength]);

  return (
    <div className="flex h-screen max-h-screen overflow-hidden">
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
              >
                <MenuIcon className="w-4 h-4" />
              </Button>
              <h1 className="text-lg sm:text-2xl md:text-3xl font-bold break-all overflow-ellipsis line-clamp-1 px-1 sm:px-5 min-w-0">
                {session.meta.firstCommand !== null
                  ? firstCommandToTitle(session.meta.firstCommand)
                  : sessionId}
              </h1>
            </div>

            <div className="px-1 sm:px-5 flex flex-wrap items-center gap-1 sm:gap-2">
              {project?.project.claudeProjectPath && (
                <Link
                  href={`/projects/${projectId}`}
                  target="_blank"
                  className="transition-all duration-200"
                >
                  <Badge
                    variant="secondary"
                    className="h-6 sm:h-8 text-xs sm:text-sm flex items-center hover:bg-blue-50/60 hover:border-blue-300/60 hover:shadow-sm transition-all duration-200 cursor-pointer"
                  >
                    <ExternalLinkIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                    {project.project.meta.projectPath ??
                      project.project.claudeProjectPath}
                  </Badge>
                </Link>
              )}
              <Badge
                variant="secondary"
                className="h-6 sm:h-8 text-xs sm:text-sm flex items-center"
              >
                {sessionId}
              </Badge>
            </div>

            {isRunningTask && (
              <div className="flex items-center gap-1 sm:gap-2 p-1 bg-primary/10 border border-primary/20 rounded-lg mx-1 sm:mx-5">
                <LoaderIcon className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                <div className="flex-1">
                  <p className="text-xs sm:text-sm font-medium">
                    Conversation is in progress...
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    abortTask.mutate(sessionId);
                  }}
                >
                  <XIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Abort</span>
                </Button>
              </div>
            )}

            {isPausedTask && (
              <div className="flex items-center gap-1 sm:gap-2 p-1 bg-primary/10 border border-primary/20 rounded-lg mx-1 sm:mx-5">
                <PauseIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                <div className="flex-1">
                  <p className="text-xs sm:text-sm font-medium">
                    Conversation is paused...
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    abortTask.mutate(sessionId);
                  }}
                >
                  <XIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Abort</span>
                </Button>
              </div>
            )}
          </div>
        </header>

        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto min-h-0 min-w-0"
        >
          <main className="w-full px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 relative z-5 min-w-0">
            <ConversationList
              conversations={conversations}
              getToolResult={getToolResult}
            />

            {isRunningTask && (
              <div className="flex justify-start items-center py-8">
                <div className="flex flex-col items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.1s]"></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:0.2s]"></div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground font-medium">
                    Claude Code is processing...
                  </p>
                </div>
              </div>
            )}

            <ResumeChat
              projectId={projectId}
              sessionId={sessionId}
              isPausedTask={isPausedTask}
              isRunningTask={isRunningTask}
            />
          </main>
        </div>
      </div>

      {/* Fixed Diff Button */}
      <Button
        onClick={() => setIsDiffModalOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 z-50"
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
    </div>
  );
};
