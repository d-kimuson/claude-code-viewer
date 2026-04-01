import { useAtomValue } from "jotai";
import { type FC, Suspense, useCallback, useState } from "react";
import { rightPanelResizingAtom } from "@/lib/atoms/rightPanel";
import { AppLayout } from "@/web/app/components/AppLayout";
import { BottomPanel } from "@/web/app/components/BottomPanel";
import { RightPanel } from "@/web/app/components/RightPanel";
import {
  EmptyFilesToolsTabContent,
  FilesToolsTabContent,
} from "@/web/app/components/rightPanel/FilesToolsTabContent";
import { GitTabContent } from "@/web/app/components/rightPanel/GitTabContent";
import { ReviewTabContent } from "@/web/app/components/rightPanel/ReviewTabContent";
import { Loading } from "@/web/components/Loading";
import { ResizableSidebar } from "@/web/components/ResizableSidebar";
import { useIsMobile } from "@/web/hooks/useIsMobile";
import { useRightPanelOpen, useRightPanelWidth } from "@/web/hooks/useRightPanel";
import { useSwipeGesture } from "@/web/hooks/useSwipeGesture";
import { useSyncRightPanelWithSearchParams } from "@/web/hooks/useSyncRightPanelWithSearchParams";
import { cn } from "@/web/utils";
import { useProject } from "../../../hooks/useProject";
import { SessionPageMain } from "./SessionPageMain";
import { MobileSidebar } from "./sessionSidebar/MobileSidebar";
import type { Tab } from "./sessionSidebar/schema";
import { SessionSidebar } from "./sessionSidebar/SessionSidebar";

/**
 * Outer shell: renders AppLayout immediately (no data fetching),
 * so the header stays visible while inner content loads.
 */
export const SessionPageContent: FC<{
  projectId: string;
  sessionId?: string;
  tab: Tab;
}> = ({ projectId, sessionId, tab }) => {
  useSyncRightPanelWithSearchParams();

  return (
    <AppLayout projectId={projectId} sessionId={sessionId}>
      <Suspense fallback={<Loading />}>
        <SessionPageInner projectId={projectId} sessionId={sessionId} tab={tab} />
      </Suspense>
    </AppLayout>
  );
};

/**
 * Inner content that depends on project data (suspends via useSuspenseInfiniteQuery).
 * Wrapped in Suspense by SessionPageContent so the AppLayout shell stays visible.
 */
const SessionPageInner: FC<{
  projectId: string;
  sessionId?: string;
  tab: Tab;
}> = ({ projectId, sessionId, tab }) => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
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

  const title = projectName ? `${projectName} - Claude Code Viewer` : "Claude Code Viewer";

  // Right panel margin (when open, reserve space for fixed right panel)
  const rightPanelMargin = isRightPanelOpen && !isMobile ? `${rightPanelWidth}%` : "0";

  const handleMobileSidebarOpen = useCallback(() => {
    setIsMobileSidebarOpen(true);
  }, []);

  const handleMobileSidebarClose = useCallback(() => {
    setIsMobileSidebarOpen(false);
  }, []);

  return (
    <>
      <title>{title}</title>
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
        style={isMobile && isMobileSidebarOpen ? { transform: "translateX(75vw)" } : undefined}
      >
        {/* Left Sidebar - full height, higher priority than bottom panel */}
        <ResizableSidebar>
          <Suspense fallback={<Loading />}>
            <SessionSidebar currentSessionId={sessionId} projectId={projectId} initialTab={tab} />
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
                onMobileMenuOpen={isMobile ? handleMobileSidebarOpen : undefined}
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
          gitTabContent={<GitTabContent projectId={projectId} sessionId={sessionId} />}
          filesToolsTabContent={
            sessionId !== undefined && sessionId !== "" ? (
              <Suspense fallback={<Loading />}>
                <FilesToolsTabContent projectId={projectId} sessionId={sessionId} />
              </Suspense>
            ) : (
              <EmptyFilesToolsTabContent />
            )
          }
          reviewTabContent={
            <Suspense fallback={<Loading />}>
              <ReviewTabContent projectId={projectId} sessionId={sessionId} />
            </Suspense>
          }
        />
      </div>
    </>
  );
};
