import { useMutation } from "@tanstack/react-query";
import type { FC } from "react";
import { useMemo, useRef, useState } from "react";
import { honoClient } from "@/lib/api/client";
import { useProject } from "../../../hooks/useProject";
import { useGitCurrentRevisions } from "../hooks/useGit";
import { useSession } from "../hooks/useSession";
import { useSessionProcess } from "../hooks/useSessionProcess";
import { SessionPageMain } from "./SessionPageMain";
import { SessionSidebar } from "./sessionSidebar/SessionSidebar";
import type { Tab } from "./sessionSidebar/schema";

export const SessionPageMainWrapper: FC<{
  projectId: string;
  sessionId: string;
  isMobileSidebarOpen: boolean;
  setIsMobileSidebarOpen: (open: boolean) => void;
  tab: Tab;
}> = ({
  projectId,
  sessionId,
  isMobileSidebarOpen,
  setIsMobileSidebarOpen,
  tab,
}) => {
  useSession(projectId, sessionId);
  const { data: projectData } = useProject(projectId);
  // biome-ignore lint/style/noNonNullAssertion: useSuspenseInfiniteQuery guarantees at least one page
  const project = projectData.pages[0]!.project;
  const { data: revisionsData } = useGitCurrentRevisions(projectId);
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

  const sessionProcess = useSessionProcess();
  const relatedSessionProcess = useMemo(
    () => sessionProcess.getSessionProcess(sessionId),
    [sessionProcess, sessionId],
  );

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

  const projectPath = project.meta.projectPath ?? project.claudeProjectPath;
  const currentBranch = revisionsData?.success
    ? revisionsData.data.currentBranch?.name
    : undefined;

  return (
    <>
      <SessionSidebar
        currentSessionId={sessionId}
        projectId={projectId}
        isMobileOpen={isMobileSidebarOpen}
        onMobileOpenChange={setIsMobileSidebarOpen}
        initialTab={tab}
      />
      <SessionPageMain
        projectId={projectId}
        sessionId={sessionId}
        setIsMobileSidebarOpen={setIsMobileSidebarOpen}
        isDiffModalOpen={isDiffModalOpen}
        setIsDiffModalOpen={setIsDiffModalOpen}
        scrollContainerRef={scrollContainerRef}
        onScrollToTop={handleScrollToTop}
        onScrollToBottom={handleScrollToBottom}
        onOpenDiffModal={() => setIsDiffModalOpen(true)}
        abortTask={abortTask}
        projectPath={projectPath}
        currentBranch={currentBranch}
        sessionProcessStatus={relatedSessionProcess?.status}
        revisionsData={revisionsData}
      />
    </>
  );
};
