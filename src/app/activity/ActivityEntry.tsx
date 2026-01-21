import { useNavigate } from "@tanstack/react-router";
import {
  AlertCircleIcon,
  BotIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  MessageSquareIcon,
  SettingsIcon,
  WrenchIcon,
} from "lucide-react";
import { type FC, type MouseEvent, useMemo, useState } from "react";
import { Button } from "../../components/ui/button";
import { cn } from "../../lib/utils";
import type { ActivityEntrySSE } from "../../types/sse";
import { ActivityEntryContext } from "./ActivityEntryContext";
import { EntityText } from "./EntityRenderer";
import { isToolPreview, ToolResultDisplay } from "./ToolResultDisplay";
import { hasErrorPatterns, parseToolPreview } from "./toolResultParser";

interface ActivityEntryItemProps {
  entry: ActivityEntrySSE;
  onProjectClick?: (projectId: string) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

// Generate a consistent color based on project ID
function getProjectColor(projectId: string): string {
  const colors = [
    "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    "bg-green-500/10 text-green-600 dark:text-green-400",
    "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    "bg-pink-500/10 text-pink-600 dark:text-pink-400",
    "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
    "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  ] as const;
  let hash = 0;
  for (let i = 0; i < projectId.length; i++) {
    hash = (hash << 5) - hash + projectId.charCodeAt(i);
    hash |= 0;
  }
  return colors[Math.abs(hash) % colors.length] ?? colors[0];
}

function getEntryIcon(entryType: ActivityEntrySSE["entryType"]) {
  switch (entryType) {
    case "user":
      return <MessageSquareIcon className="h-4 w-4" />;
    case "assistant":
      return <BotIcon className="h-4 w-4" />;
    case "system":
      return <SettingsIcon className="h-4 w-4" />;
    case "tool":
      return <WrenchIcon className="h-4 w-4" />;
    default:
      return <MessageSquareIcon className="h-4 w-4" />;
  }
}

function getEntryTypeStyles(entryType: ActivityEntrySSE["entryType"]) {
  switch (entryType) {
    case "user":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
    case "assistant":
      return "bg-purple-500/10 text-purple-600 dark:text-purple-400";
    case "system":
      return "bg-gray-500/10 text-gray-600 dark:text-gray-400";
    case "tool":
      return "bg-orange-500/10 text-orange-600 dark:text-orange-400";
    default:
      return "bg-gray-500/10 text-gray-600 dark:text-gray-400";
  }
}

function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

function extractProjectName(projectId: string): string {
  try {
    const decoded = atob(projectId);
    const lastSegment = decoded.split("/").pop() || "";
    const parts = lastSegment.split("-").filter(Boolean);
    if (parts.length >= 2) {
      const repoName = parts[parts.length - 1];
      if (repoName && repoName.length <= 3 && parts.length >= 2) {
        return `${parts[parts.length - 2]}-${repoName}`;
      }
      return repoName || projectId.slice(0, 8);
    }
    return lastSegment.slice(0, 20) || projectId.slice(0, 8);
  } catch {
    return projectId.slice(0, 8);
  }
}

function isThinkingEntry(preview: string): boolean {
  return preview.startsWith("💭");
}

export const ActivityEntryItem: FC<ActivityEntryItemProps> = ({
  entry,
  onProjectClick,
  isExpanded = false,
  onToggleExpand,
}) => {
  const navigate = useNavigate();
  const projectName = extractProjectName(entry.projectId);
  const projectColor = getProjectColor(entry.projectId);
  const [isThinkingExpanded, setIsThinkingExpanded] = useState(false);

  const isThinking = isThinkingEntry(entry.preview);
  const isTool = isToolPreview(entry.preview);

  // Check if this entry has an error
  const hasError = useMemo(() => {
    if (isTool) {
      const parsed = parseToolPreview(entry.preview);
      return parsed?.isError ?? false;
    }
    return hasErrorPatterns(entry.preview);
  }, [entry.preview, isTool]);

  const handleProjectBadgeClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onProjectClick) {
      onProjectClick(entry.projectId);
    } else {
      navigate({
        to: "/projects/$projectId/session",
        params: { projectId: entry.projectId },
        search: { tab: "sessions" },
      });
    }
  };

  const handleThinkingToggle = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsThinkingExpanded(!isThinkingExpanded);
  };

  const handleClick = () => {
    onToggleExpand?.();
  };

  return (
    <div
      className={cn(
        "transition-all",
        isExpanded && "bg-accent/30 ring-1 ring-border",
      )}
    >
      <button
        type="button"
        onClick={handleClick}
        className="w-full text-left hover:bg-accent/50 transition-colors"
      >
        <div className="px-4 py-3 flex gap-3">
          {/* Expand indicator */}
          <div className="flex-shrink-0 w-4 flex items-center justify-center">
            {isExpanded ? (
              <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRightIcon className="h-4 w-4 text-muted-foreground/50" />
            )}
          </div>

          {/* Entry type icon */}
          <div
            className={cn(
              "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
              hasError
                ? "bg-red-500/10 text-red-600 dark:text-red-400"
                : getEntryTypeStyles(entry.entryType),
            )}
          >
            {hasError ? (
              <AlertCircleIcon className="h-4 w-4" />
            ) : (
              getEntryIcon(entry.entryType)
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {/* Project badge - clickable */}
              <button
                type="button"
                onClick={handleProjectBadgeClick}
                className={cn(
                  "text-xs font-medium px-2 py-0.5 rounded-full truncate max-w-[150px] cursor-pointer",
                  "hover:ring-2 hover:ring-offset-1 hover:ring-offset-background transition-all",
                  projectColor,
                )}
                title={`View ${projectName} sessions`}
              >
                {projectName}
              </button>

              {/* Entry type label */}
              <span
                className={cn(
                  "text-xs capitalize",
                  hasError
                    ? "text-red-600 dark:text-red-400 font-medium"
                    : "text-muted-foreground",
                )}
              >
                {hasError ? "error" : entry.entryType}
              </span>

              {/* Timestamp */}
              <span className="text-xs text-muted-foreground/70 ml-auto flex-shrink-0">
                {formatRelativeTime(entry.timestamp)}
              </span>
            </div>

            {/* Preview text */}
            {isThinking ? (
              <div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleThinkingToggle}
                  className="h-auto p-0 text-sm text-muted-foreground hover:text-foreground font-normal"
                >
                  <span className="flex items-center gap-1">
                    💭 Thinking
                    <ChevronDownIcon
                      className={cn(
                        "h-3 w-3 transition-transform",
                        isThinkingExpanded && "rotate-180",
                      )}
                    />
                  </span>
                </Button>
                {isThinkingExpanded && (
                  <p className="text-sm text-foreground/60 mt-1 break-words whitespace-pre-wrap">
                    {entry.preview.slice(2).trim()}
                  </p>
                )}
              </div>
            ) : isTool ? (
              <ToolResultDisplay
                preview={entry.preview}
                showFullPreview={isExpanded}
              />
            ) : (
              <div
                className={cn(isExpanded ? "line-clamp-none" : "line-clamp-2")}
              >
                {entry.preview ? (
                  <EntityText
                    text={entry.preview}
                    className="text-sm text-foreground/80"
                  />
                ) : (
                  <span className="text-sm text-muted-foreground italic">
                    No content
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </button>

      {/* Expanded context view */}
      {isExpanded && (
        <ActivityEntryContext
          projectId={entry.projectId}
          sessionId={entry.sessionId}
          timestamp={entry.timestamp}
        />
      )}
    </div>
  );
};

// Tool group component for collapsed consecutive tool calls
interface ToolGroupProps {
  entries: ActivityEntrySSE[];
  onProjectClick?: (projectId: string) => void;
  expandedEntryId?: string | null;
  onToggleExpand?: (entryId: string) => void;
}

export const ToolGroup: FC<ToolGroupProps> = ({
  entries,
  onProjectClick,
  expandedEntryId,
  onToggleExpand,
}) => {
  const [isGroupExpanded, setIsGroupExpanded] = useState(false);

  const firstEntry = entries[0];
  if (!firstEntry) return null;

  const projectName = extractProjectName(firstEntry.projectId);
  const projectColor = getProjectColor(firstEntry.projectId);

  const handleToggle = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsGroupExpanded(!isGroupExpanded);
  };

  return (
    <div className="border-l-2 border-orange-500/30">
      <button
        type="button"
        onClick={handleToggle}
        className="w-full text-left hover:bg-accent/50 transition-colors"
      >
        <div className="px-4 py-2 flex items-center gap-3">
          <div className="flex-shrink-0 w-4 flex items-center justify-center">
            {isGroupExpanded ? (
              <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRightIcon className="h-4 w-4 text-muted-foreground/50" />
            )}
          </div>
          <div
            className={cn(
              "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
              getEntryTypeStyles("tool"),
            )}
          >
            <WrenchIcon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0 flex items-center gap-2">
            <span
              className={cn(
                "text-xs font-medium px-2 py-0.5 rounded-full",
                projectColor,
              )}
            >
              {projectName}
            </span>
            <span className="text-sm text-muted-foreground">
              {entries.length} tool calls
            </span>
          </div>
        </div>
      </button>
      {isGroupExpanded && (
        <div className="pl-4 divide-y divide-border/50">
          {entries.map((entry) => (
            <ActivityEntryItem
              key={entry.id}
              entry={entry}
              onProjectClick={onProjectClick}
              isExpanded={expandedEntryId === entry.id}
              onToggleExpand={() => onToggleExpand?.(entry.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
