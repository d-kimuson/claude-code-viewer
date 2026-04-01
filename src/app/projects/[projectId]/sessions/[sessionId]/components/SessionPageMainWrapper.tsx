import { type FC, Suspense } from "react";
import { Loading } from "../../../../../../components/Loading";
import { useProject } from "../../../hooks/useProject";
import { SessionPageMain } from "./SessionPageMain";
import type { Tab } from "./sessionSidebar/schema";
import { SessionSidebar } from "./sessionSidebar/SessionSidebar";

export const SessionPageMainWrapper: FC<{
  projectId: string;
  sessionId?: string;
  tab: Tab;
}> = ({ projectId, sessionId, tab }) => {
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
        <SessionSidebar currentSessionId={sessionId} projectId={projectId} initialTab={tab} />
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
