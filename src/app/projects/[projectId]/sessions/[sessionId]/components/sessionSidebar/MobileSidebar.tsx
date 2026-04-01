import { Trans, useLingui } from "@lingui/react";
import { Link } from "@tanstack/react-router";
import { PlusIcon, XIcon } from "lucide-react";
import { type FC, Suspense, useEffect, useState } from "react";
import { NotificationSettings } from "@/components/NotificationSettings";
import { SettingsControls } from "@/components/SettingsControls";
import { SystemInfoCard } from "@/components/SystemInfoCard";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSwipeGesture } from "@/hooks/useSwipeGesture";
import { cn } from "@/lib/utils";
import { McpTab } from "./McpTab";
import { SchedulerTab } from "./SchedulerTab";
import { tabSchema, type Tab } from "./schema";
import { SessionsTab } from "./SessionsTab";
import { TasksTab } from "./TasksTab";

type MobileSidebarProps = {
  currentSessionId: string;
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  /** Tab to show when opened */
  initialTab?: Tab;
};

export const MobileSidebar: FC<MobileSidebarProps> = ({
  currentSessionId,
  projectId,
  isOpen,
  onClose,
  initialTab = "sessions",
}) => {
  const { i18n } = useLingui();
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const currentTab = activeTab;

  const tabLabels: Record<Tab, string> = {
    sessions: i18n._({ id: "sidebar.tab.sessions" }),
    mcp: i18n._({ id: "sidebar.tab.mcp" }),
    tasks: i18n._({ id: "sidebar.tab.tasks" }),
    scheduler: i18n._({ id: "sidebar.tab.scheduler" }),
    settings: i18n._({ id: "sidebar.tab.settings" }),
    "system-info": i18n._({ id: "sidebar.tab.system_info" }),
  };

  // Sync tab only when initialTab changes (e.g. opened from a specific tab trigger)
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Handle escape key and prevent background scroll
  useEffect(() => {
    if (!isOpen) return;

    document.body.style.overflow = "hidden";

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
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

  const handleTabChange = (value: string) => {
    const parsed = tabSchema.safeParse(value);
    if (parsed.success) {
      setActiveTab(parsed.data);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case "sessions":
        return (
          <SessionsTab
            currentSessionId={currentSessionId}
            projectId={projectId}
            onSessionSelect={onClose}
          />
        );
      case "mcp":
        return <McpTab projectId={projectId} />;
      case "tasks":
        return <TasksTab projectId={projectId} sessionId={currentSessionId} />;
      case "scheduler":
        return <SchedulerTab projectId={projectId} sessionId={currentSessionId} />;
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
        return (
          <Suspense
            fallback={
              <div className="flex-1 flex items-center justify-center p-4">
                <div className="text-sm text-sidebar-foreground/70">Loading...</div>
              </div>
            }
          >
            <SystemInfoCard />
          </Suspense>
        );
      default:
        return null;
    }
  };

  return (
    <div
      ref={swipeRef}
      className={cn(
        "fixed inset-y-0 left-0 w-[75vw] z-50 bg-sidebar text-sidebar-foreground flex flex-col shadow-xl md:hidden",
        "transition-transform duration-300 ease-out",
        isOpen ? "translate-x-0" : "-translate-x-full",
      )}
    >
      {/* Header with tab selector, new chat button, and close button */}
      <div className="h-(--spacing-header-height) flex items-center gap-2 px-3 border-b border-sidebar-border bg-sidebar/80 backdrop-blur-sm flex-shrink-0">
        <Select value={activeTab} onValueChange={handleTabChange}>
          <SelectTrigger className="flex-1 h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {tabSchema.options.map((tab) => (
              <SelectItem key={tab} value={tab} className="text-xs">
                {tabLabels[tab]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Link
          to="/projects/$projectId/session"
          params={{ projectId }}
          search={{ tab: currentTab }}
          onClick={onClose}
          className="flex-shrink-0"
        >
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 hover:bg-sidebar-accent/50"
            aria-label={i18n._("New chat")}
          >
            <PlusIcon className="w-3.5 h-3.5" />
          </Button>
        </Link>

        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="h-7 w-7 p-0 hover:bg-sidebar-accent/50 flex-shrink-0"
          aria-label={i18n._("Close sidebar")}
        >
          <XIcon className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">{renderContent()}</div>
    </div>
  );
};
