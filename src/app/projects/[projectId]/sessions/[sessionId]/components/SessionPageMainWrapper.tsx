import type { FC } from "react";
import { Suspense } from "react";
import { Loading } from "../../../../../../components/Loading";
import { useProject } from "../../../hooks/useProject";
import { SessionPageMain } from "./SessionPageMain";
import { SessionSidebar } from "./sessionSidebar/SessionSidebar";
import type { Tab } from "./sessionSidebar/schema";

export const SessionPageMainWrapper: FC<{
  projectId: string;
  sessionId?: string;
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
  const { data: projectData } = useProject(projectId);
  const firstPage = projectData.pages[0];
  if (firstPage === undefined) {
    return null;
  }
  const project = firstPage.project;

  const projectPath = project.meta.projectPath ?? project.claudeProjectPath;

  return (
    <>
      <Suspense fallback={<Loading />}>
        <SessionSidebar
          currentSessionId={sessionId}
          projectId={projectId}
          isMobileOpen={isMobileSidebarOpen}
          onMobileOpenChange={setIsMobileSidebarOpen}
          initialTab={tab}
        />
      </Suspense>
      <Suspense fallback={<Loading />}>
        <SessionPageMain
          projectId={projectId}
          sessionId={sessionId}
          projectPath={projectPath}
          projectName={project.meta.projectName ?? "Untitled Project"}
        />
      </Suspense>
    </>
  );
};
