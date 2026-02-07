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
import { useLayoutPanels } from "@/hooks/useLayoutPanels";
import { useRightPanel } from "@/hooks/useRightPanel";
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
  const isMobile = useIsMobile();
  const { isOpen: isRightPanelOpen, width: rightPanelWidth } = useRightPanel();
  const { isBottomPanelOpen, bottomPanelHeight } = useLayoutPanels();
  const { data: projectData } = useProject(projectId);

  const firstPage = projectData.pages[0];
  const project = firstPage?.project;
  const projectPath = project?.meta.projectPath ?? project?.claudeProjectPath;
  const projectName = project?.meta.projectName ?? "Untitled Project";

  // Calculate main content height based on bottom panel
  const mainContentHeight = isBottomPanelOpen ? 100 - bottomPanelHeight : 100;

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
      <div className="flex flex-col h-full">
        {/* Main content area with sidebar */}
        <div
          className="flex flex-1 min-h-0 overflow-hidden transition-all duration-200"
          style={{
            height: `${mainContentHeight}%`,
            marginRight: rightPanelMargin,
          }}
        >
          <div className="flex h-full w-full">
            {/* Left Sidebar - Resizable (Desktop only, controlled by ResizableSidebar) */}
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

            {/* Main Chat Area */}
            <Suspense fallback={<Loading />}>
              <SessionPageMain
                projectId={projectId}
                sessionId={sessionId}
                projectPath={projectPath}
                projectName={projectName}
              />
            </Suspense>
          </div>

          {/* Right Panel */}
          <RightPanel
            projectId={projectId}
            sessionId={sessionId}
            gitTabContent={
              sessionId ? (
                <Suspense fallback={<Loading />}>
                  <GitTabContent projectId={projectId} sessionId={sessionId} />
                </Suspense>
              ) : null
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

        {/* Bottom Panel */}
        <BottomPanel />
      </div>
    </AppLayout>
  );
};
