import { Link } from "@tanstack/react-router";
import {
  BotIcon,
  MessageSquareIcon,
  SettingsIcon,
  WrenchIcon,
} from "lucide-react";
import type { FC } from "react";
import { cn } from "../../lib/utils";
import type { ActivityEntrySSE } from "../../types/sse";

interface ActivityEntryItemProps {
  entry: ActivityEntrySSE;
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
  // Project IDs are base64 encoded Claude project paths
  // Format: /Users/davidmora/.claude/projects/-Users-davidmora-Projects-github-com-owner-repo
  // We want to extract just the repo name (last hyphen-separated part)
  try {
    const decoded = atob(projectId);
    // Get the last path segment (the Claude project folder name)
    const lastSegment = decoded.split("/").pop() || "";
    // Claude project folders use hyphens as path separators
    // Extract the last meaningful part (usually repo name)
    const parts = lastSegment.split("-").filter(Boolean);
    // Return last part (repo name) or last two parts (owner-repo) if short
    if (parts.length >= 2) {
      const repoName = parts[parts.length - 1];
      // If repo name is very short, include owner
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

export const ActivityEntryItem: FC<ActivityEntryItemProps> = ({ entry }) => {
  const projectName = extractProjectName(entry.projectId);
  const projectColor = getProjectColor(entry.projectId);

  return (
    <Link
      to="/projects/$projectId/session"
      params={{ projectId: entry.projectId }}
      search={{ sessionId: entry.sessionId }}
      className="block hover:bg-accent/50 transition-colors"
    >
      <div className="px-4 py-3 flex gap-3">
        {/* Entry type icon */}
        <div
          className={cn(
            "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
            getEntryTypeStyles(entry.entryType),
          )}
        >
          {getEntryIcon(entry.entryType)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {/* Project badge */}
            <span
              className={cn(
                "text-xs font-medium px-2 py-0.5 rounded-full truncate max-w-[150px]",
                projectColor,
              )}
              title={projectName}
            >
              {projectName}
            </span>

            {/* Entry type label */}
            <span className="text-xs text-muted-foreground capitalize">
              {entry.entryType}
            </span>

            {/* Timestamp */}
            <span className="text-xs text-muted-foreground/70 ml-auto flex-shrink-0">
              {formatRelativeTime(entry.timestamp)}
            </span>
          </div>

          {/* Preview text */}
          <p className="text-sm text-foreground/80 line-clamp-2 break-words">
            {entry.preview || (
              <span className="text-muted-foreground italic">No content</span>
            )}
          </p>
        </div>
      </div>
    </Link>
  );
};
