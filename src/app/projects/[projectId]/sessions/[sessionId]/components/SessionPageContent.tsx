"use client";

import { useMutation } from "@tanstack/react-query";
import {
  ArrowLeftIcon,
  LoaderIcon,
  MenuIcon,
  PauseIcon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import type { FC } from "react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { honoClient } from "../../../../../../lib/api/client";
import { useProject } from "../../../hooks/useProject";
import { firstCommandToTitle } from "../../../services/firstCommandToTitle";
import { useAliveTask } from "../hooks/useAliveTask";
import { useSession } from "../hooks/useSession";
import { ConversationList } from "./conversationList/ConversationList";
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

  const [previousConversationLength, setPreviousConversationLength] =
    useState(0);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
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
    <div className="flex h-screen max-h-screen">
      <SessionSidebar
        currentSessionId={sessionId}
        projectId={projectId}
        isMobileOpen={isMobileSidebarOpen}
        onMobileOpenChange={setIsMobileSidebarOpen}
      />

      <div className="flex-1 flex flex-col min-h-0">
        <header className="px-2 sm:px-3 py-3 sticky top-0 z-10 bg-background w-full flex-shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setIsMobileSidebarOpen(true)}
            >
              <MenuIcon className="w-4 h-4" />
            </Button>

            <Button asChild variant="ghost">
              <Link
                href={`/projects/${projectId}`}
                className="flex items-center gap-2"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Back to Session List</span>
                <span className="sm:hidden">Back</span>
              </Link>
            </Button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold break-all overflow-ellipsis line-clamp-1 px-2 sm:px-5">
                {session.meta.firstCommand !== null
                  ? firstCommandToTitle(session.meta.firstCommand)
                  : sessionId}
              </h1>
            </div>

            <div className="px-2 sm:px-5 space-y-1">
              {project?.project.claudeProjectPath && (
                <p className="text-sm text-muted-foreground font-mono break-all">
                  Project:{" "}
                  {project.project.meta.projectPath ??
                    project.project.claudeProjectPath}
                </p>
              )}
              <p className="text-sm text-muted-foreground font-mono">
                Session ID: {sessionId}
              </p>
            </div>

            {isRunningTask && (
              <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                <LoaderIcon className="w-4 h-4 animate-spin" />
                <div className="flex-1">
                  <p className="text-sm font-medium">
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
                  <XIcon className="w-4 h-4" />
                  Abort
                </Button>
              </div>
            )}

            {isPausedTask && (
              <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                <PauseIcon className="w-4 h-4" />
                <div className="flex-1">
                  <p className="text-sm font-medium">
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
                  <XIcon className="w-4 h-4" />
                  Abort
                </Button>
              </div>
            )}
          </div>
        </header>

        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto min-h-0"
        >
          <main className="w-full px-4 sm:px-8 md:px-12 lg:px-16 xl:px-20 pb-20 sm:pb-10 relative z-5">
            <ConversationList
              conversations={conversations}
              getToolResult={getToolResult}
            />

            <ResumeChat
              projectId={projectId}
              sessionId={sessionId}
              isPausedTask={isPausedTask}
              isRunningTask={isRunningTask}
            />
          </main>
        </div>
      </div>
    </div>
  );
};
