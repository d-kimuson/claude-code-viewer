"use client";

import {
  ArrowLeftIcon,
  MessageSquareIcon,
  PlugIcon,
  SettingsIcon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { type FC, Suspense, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { NotificationSettings } from "@/components/NotificationSettings";
import { SettingsControls } from "@/components/SettingsControls";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useProject } from "../../../../hooks/useProject";
import { McpTab } from "./McpTab";
import { SessionsTab } from "./SessionsTab";

interface MobileSidebarProps {
  currentSessionId: string;
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const MobileSidebar: FC<MobileSidebarProps> = ({
  currentSessionId,
  projectId,
  isOpen,
  onClose,
}) => {
  const {
    data: projectData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useProject(projectId);
  const sessions = projectData.pages.flatMap((page) => page.sessions);
  const [activeTab, setActiveTab] = useState<"sessions" | "mcp" | "settings">(
    "sessions",
  );
  const [mounted, setMounted] = useState(false);

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
      // Prevent body scroll when sidebar is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  const handleTabClick = (tab: "sessions" | "mcp" | "settings") => {
    setActiveTab(tab);
  };

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
            sessions={sessions.map((session) => ({
              ...session,
              lastModifiedAt: new Date(session.lastModifiedAt),
            }))}
            currentSessionId={currentSessionId}
            projectId={projectId}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            onLoadMore={() => fetchNextPage()}
            isMobile={true}
          />
        );
      case "mcp":
        return <McpTab projectId={projectId} />;
      case "settings":
        return (
          <div className="h-full flex flex-col">
            <Suspense
              fallback={
                <div className="flex-1 flex items-center justify-center p-4">
                  <div className="text-sm text-sidebar-foreground/70">
                    Loading settings...
                  </div>
                </div>
              }
            >
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                <div className="space-y-4">
                  <h3 className="font-medium text-sm text-sidebar-foreground">
                    Session Display
                  </h3>
                  <SettingsControls openingProjectId={projectId} />
                </div>

                <div className="space-y-4">
                  <h3 className="font-medium text-sm text-sidebar-foreground">
                    Notifications
                  </h3>
                  <NotificationSettings />
                </div>
              </div>
            </Suspense>
          </div>
        );
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
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm cursor-default"
        onClick={handleBackdropClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            onClose();
          }
        }}
        aria-label="Close sidebar"
      />

      {/* Sidebar */}
      <div
        className={cn(
          "absolute left-0 top-0 h-full w-80 max-w-[85vw] bg-sidebar text-sidebar-foreground transition-transform duration-300 ease-out flex",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Tab Icons */}
        <div className="w-12 flex flex-col border-r border-sidebar-border bg-sidebar/50">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/projects"
                  className="w-12 h-12 flex items-center justify-center border-b border-sidebar-border hover:bg-sidebar-accent transition-colors"
                >
                  <ArrowLeftIcon className="w-4 h-4 text-sidebar-foreground/70" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>プロジェクト一覧に戻る</p>
              </TooltipContent>
            </Tooltip>

            <div className="flex flex-col p-2 space-y-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => handleTabClick("sessions")}
                    className={cn(
                      "w-8 h-8 flex items-center justify-center rounded-md transition-colors",
                      "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      activeTab === "sessions"
                        ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                        : "text-sidebar-foreground/70",
                    )}
                    data-testid="sessions-tab-button-mobile"
                  >
                    <MessageSquareIcon className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>セッション一覧を表示</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => handleTabClick("mcp")}
                    className={cn(
                      "w-8 h-8 flex items-center justify-center rounded-md transition-colors",
                      "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      activeTab === "mcp"
                        ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                        : "text-sidebar-foreground/70",
                    )}
                    data-testid="mcp-tab-button-mobile"
                  >
                    <PlugIcon className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>MCPサーバー設定を表示</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => handleTabClick("settings")}
                    className={cn(
                      "w-8 h-8 flex items-center justify-center rounded-md transition-colors",
                      "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      activeTab === "settings"
                        ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                        : "text-sidebar-foreground/70",
                    )}
                    data-testid="settings-tab-button-mobile"
                  >
                    <SettingsIcon className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>表示と通知の設定</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header with close button */}
          <div className="flex items-center justify-between p-4 border-b border-sidebar-border bg-sidebar/80 backdrop-blur-sm">
            <h2 className="text-lg font-semibold capitalize">{activeTab}</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 hover:bg-sidebar-accent/50"
            >
              <XIcon className="w-4 h-4" />
            </Button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-hidden">{renderContent()}</div>
        </div>
      </div>
    </div>,
    document.body,
  );
};
