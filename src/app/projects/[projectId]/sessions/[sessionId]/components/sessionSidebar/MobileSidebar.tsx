import { Trans, useLingui } from "@lingui/react";
import { XIcon } from "lucide-react";
import { type FC, Suspense, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { NotificationSettings } from "@/components/NotificationSettings";
import { SettingsControls } from "@/components/SettingsControls";
import { SystemInfoCard } from "@/components/SystemInfoCard";
import { Button } from "@/components/ui/button";
import { useSwipeGesture } from "@/hooks/useSwipeGesture";
import { cn } from "@/lib/utils";
import { McpTab } from "./McpTab";
import { SchedulerTab } from "./SchedulerTab";
import { SessionsTab } from "./SessionsTab";
import { TasksTab } from "./TasksTab";

interface MobileSidebarProps {
  currentSessionId: string;
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  /** Tab to show when opened, synced from GlobalSidebar icon clicks */
  initialTab?: string;
}

export const MobileSidebar: FC<MobileSidebarProps> = ({
  currentSessionId,
  projectId,
  isOpen,
  onClose,
  initialTab = "sessions",
}) => {
  const { i18n } = useLingui();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [mounted, setMounted] = useState(false);

  // Sync tab when opened from GlobalSidebar icon click
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Handle portal mounting
  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  // Swipe left to close sidebar
  const swipeRef = useSwipeGesture({
    onSwipe: (direction) => {
      if (direction === "left") {
        onClose();
      }
    },
    enabled: isOpen,
  });

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case "sessions":
        return (
          <SessionsTab
            currentSessionId={currentSessionId}
            projectId={projectId}
            isMobile={true}
          />
        );
      case "mcp":
        return <McpTab projectId={projectId} />;
      case "tasks":
        return <TasksTab projectId={projectId} sessionId={currentSessionId} />;
      case "scheduler":
        return (
          <SchedulerTab projectId={projectId} sessionId={currentSessionId} />
        );
      case "settings":
        return (
          <div className="h-full flex flex-col">
            <Suspense
              fallback={
                <div className="flex-1 flex items-center justify-center p-4">
                  <div className="text-sm text-sidebar-foreground/70">
                    <Trans id="settings.loading" />
                  </div>
                </div>
              }
            >
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                <div className="space-y-4">
                  <h3 className="font-medium text-sm text-sidebar-foreground">
                    <Trans id="settings.session.display" />
                  </h3>
                  <SettingsControls openingProjectId={projectId} />
                </div>

                <div className="space-y-4">
                  <h3 className="font-medium text-sm text-sidebar-foreground">
                    <Trans id="settings.notifications" />
                  </h3>
                  <NotificationSettings />
                </div>
              </div>
            </Suspense>
          </div>
        );
      case "system-info":
        return <SystemInfoCard />;
      default:
        return null;
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-50 transition-all duration-300 ease-out md:hidden",
        isOpen
          ? "visible opacity-100"
          : "invisible opacity-0 pointer-events-none",
      )}
    >
      {/* Backdrop - starts after the icon menu so icons remain clickable */}
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm cursor-default"
        onClick={handleBackdropClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            onClose();
          }
        }}
        style={{ left: "var(--sidebar-icon-menu-width-mobile)" }}
        aria-label={i18n._("Close sidebar")}
      />

      {/* Content overlay - positioned next to the always-visible icon menu */}
      <div
        ref={swipeRef}
        className={cn(
          "absolute top-0 h-full w-72 max-w-[calc(85vw-var(--sidebar-icon-menu-width-mobile))] bg-sidebar text-sidebar-foreground transition-transform duration-300 ease-out flex flex-col shadow-xl",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
        style={{ left: "var(--sidebar-icon-menu-width-mobile)" }}
      >
        {/* Header with close button - matches AppLayout header height */}
        <div className="h-(--spacing-header-height) flex items-center justify-between px-3 border-b border-sidebar-border bg-sidebar/80 backdrop-blur-sm flex-shrink-0">
          <h2 className="text-sm font-semibold capitalize">{activeTab}</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-7 w-7 p-0 hover:bg-sidebar-accent/50"
          >
            <XIcon className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden">{renderContent()}</div>
      </div>
    </div>,
    document.body,
  );
};
