import { type FC, Suspense, useState } from "react";
import { AppLayout } from "@/app/components/AppLayout";
import { BottomPanel } from "@/app/components/BottomPanel";
import { RightPanel } from "@/app/components/RightPanel";
import { FilesToolsTabContent } from "@/app/components/rightPanel/FilesToolsTabContent";
import { GitTabContent } from "@/app/components/rightPanel/GitTabContent";
import { ReviewTabContent } from "@/app/components/rightPanel/ReviewTabContent";
import { Loading } from "@/components/Loading";
import { ResizableSidebar } from "@/components/ResizableSidebar";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useRightPanelOpen, useRightPanelWidth } from "@/hooks/useRightPanel";
import { useSyncRightPanelWithSearchParams } from "@/hooks/useSyncRightPanelWithSearchParams";
import { useProject } from "../../../hooks/useProject";
import { SessionPageMain } from "./SessionPageMain";
import { SessionSidebar } from "./sessionSidebar/SessionSidebar";
import type { Tab } from "./sessionSidebar/schema";

export const SessionPageContent: FC<{
  projectId: string;
  sessionId?: string;
  tab: Tab;
}> = ({ projectId, sessionId, tab }) => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  useSyncRightPanelWithSearchParams();
  const isMobile = useIsMobile();
  const isRightPanelOpen = useRightPanelOpen();
  const rightPanelWidth = useRightPanelWidth();
  const { data: projectData } = useProject(projectId);

  const firstPage = projectData.pages[0];
  const project = firstPage?.project;
  const projectPath = project?.meta.projectPath ?? project?.claudeProjectPath;
  const projectName = project?.meta.projectName ?? "Untitled Project";

  // Right panel margin (when open, reserve space for fixed right panel)
  const rightPanelMargin =
    isRightPanelOpen && !isMobile ? `${rightPanelWidth}%` : "0";

  return (
    <AppLayout
      projectPath={projectPath}
      sessionId={sessionId}
      projectName={projectName}
      onMobileLeftPanelOpen={() => setIsMobileSidebarOpen(true)}
    >
      <div className="flex h-full overflow-hidden">
        {/* Left Sidebar - full height, higher priority than bottom panel */}
        <ResizableSidebar>
          <Suspense fallback={<Loading />}>
            <SessionSidebar
              currentSessionId={sessionId}
              projectId={projectId}
              isMobileOpen={isMobileSidebarOpen}
              onMobileOpenChange={setIsMobileSidebarOpen}
              initialTab={tab}
            />
          </Suspense>
        </ResizableSidebar>

        {/* Center column: main content + bottom panel */}
        <div
          className="flex flex-col flex-1 min-w-0 transition-all duration-200"
          style={{ marginRight: rightPanelMargin }}
        >
          {/* Main Chat Area */}
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <Suspense fallback={<Loading />}>
              <SessionPageMain
                projectId={projectId}
                sessionId={sessionId}
                projectPath={projectPath}
                projectName={projectName}
              />
            </Suspense>
          </div>

          {/* Bottom Panel - between left and right panels */}
          <BottomPanel cwd={projectPath} />
        </div>

        {/* Right Panel - fixed position, full height */}
        <RightPanel
          projectId={projectId}
          sessionId={sessionId}
          gitTabContent={
            <Suspense fallback={<Loading />}>
              <GitTabContent projectId={projectId} sessionId={sessionId} />
            </Suspense>
          }
          filesToolsTabContent={
            sessionId ? (
              <Suspense fallback={<Loading />}>
                <FilesToolsTabContent
                  projectId={projectId}
                  sessionId={sessionId}
                />
              </Suspense>
            ) : null
          }
          reviewTabContent={
            <Suspense fallback={<Loading />}>
              <ReviewTabContent projectId={projectId} sessionId={sessionId} />
            </Suspense>
          }
        />
      </div>
    </AppLayout>
  );
};
