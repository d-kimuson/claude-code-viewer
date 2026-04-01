import { useAtomValue } from "jotai";
import { type FC, Suspense, useCallback, useState } from "react";
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
import { useSwipeGesture } from "@/hooks/useSwipeGesture";
import { useSyncRightPanelWithSearchParams } from "@/hooks/useSyncRightPanelWithSearchParams";
import { rightPanelResizingAtom } from "@/lib/atoms/rightPanel";
import { cn } from "@/lib/utils";
import { useProject } from "../../../hooks/useProject";
import { SessionPageMain } from "./SessionPageMain";
import { MobileSidebar } from "./sessionSidebar/MobileSidebar";
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

  // Swipe from left edge to open mobile sidebar
  const swipeToOpenRef = useSwipeGesture({
    onSwipe: (direction) => {
      if (direction === "right" && !isMobileSidebarOpen) {
        setIsMobileSidebarOpen(true);
      }
    },
    edgeWidth: 30,
    enabled: isMobile,
  });
  const isRightPanelOpen = useRightPanelOpen();
  const rightPanelWidth = useRightPanelWidth();
  const isRightPanelResizing = useAtomValue(rightPanelResizingAtom);
  const { data: projectData } = useProject(projectId);

  const firstPage = projectData.pages[0];
  const project = firstPage?.project;
  const projectPath = project?.meta.projectPath ?? project?.claudeProjectPath;
  const projectName = project?.meta.projectName ?? "Untitled Project";

  // Right panel margin (when open, reserve space for fixed right panel)
  const rightPanelMargin =
    isRightPanelOpen && !isMobile ? `${rightPanelWidth}%` : "0";

  const handleMobileSidebarOpen = useCallback(() => {
    setIsMobileSidebarOpen(true);
  }, []);

  const handleMobileSidebarClose = useCallback(() => {
    setIsMobileSidebarOpen(false);
  }, []);

  return (
    <AppLayout
      projectId={projectId}
      projectPath={projectPath}
      sessionId={sessionId}
    >
      {/* Mobile sidebar (fixed, push-style) */}
      {isMobile && (
        <MobileSidebar
          currentSessionId={sessionId ?? ""}
          projectId={projectId}
          isOpen={isMobileSidebarOpen}
          onClose={handleMobileSidebarClose}
          initialTab={tab}
        />
      )}

      {/* Backdrop overlay - closes sidebar when tapping pushed content */}
      {isMobile && isMobileSidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          onClick={handleMobileSidebarClose}
          aria-label="Close sidebar"
        />
      )}

      {/* Main layout wrapper - pushed right when mobile sidebar is open */}
      <div
        ref={swipeToOpenRef}
        className={cn(
          "flex h-full overflow-hidden",
          isMobile && "transition-transform duration-300 ease-out",
        )}
        style={
          isMobile && isMobileSidebarOpen
            ? { transform: "translateX(75vw)" }
            : undefined
        }
      >
        {/* Left Sidebar - full height, higher priority than bottom panel */}
        <ResizableSidebar>
          <Suspense fallback={<Loading />}>
            <SessionSidebar
              currentSessionId={sessionId}
              projectId={projectId}
              initialTab={tab}
            />
          </Suspense>
        </ResizableSidebar>

        {/* Center column: main content + bottom panel */}
        <div
          className={cn(
            "flex flex-col flex-1 min-w-0",
            !isRightPanelResizing && "transition-all duration-200",
          )}
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
                onMobileMenuOpen={
                  isMobile ? handleMobileSidebarOpen : undefined
                }
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
            <GitTabContent projectId={projectId} sessionId={sessionId} />
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
