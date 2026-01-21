import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  BotIcon,
  ExternalLinkIcon,
  Loader2Icon,
  MessageSquareIcon,
  SettingsIcon,
  WrenchIcon,
} from "lucide-react";
import type { FC } from "react";
import { Button } from "../../components/ui/button";
import { activityContextQuery } from "../../lib/api/queries";
import { cn } from "../../lib/utils";

interface ContextEntry {
  type: "user" | "assistant" | "system" | "tool" | "unknown";
  preview: string;
  timestamp: string;
  isTarget: boolean;
}

interface ActivityEntryContextProps {
  projectId: string;
  sessionId: string;
  timestamp: string;
}

function getEntryIcon(type: ContextEntry["type"]) {
  switch (type) {
    case "user":
      return <MessageSquareIcon className="h-3 w-3" />;
    case "assistant":
      return <BotIcon className="h-3 w-3" />;
    case "system":
      return <SettingsIcon className="h-3 w-3" />;
    case "tool":
      return <WrenchIcon className="h-3 w-3" />;
    default:
      return <MessageSquareIcon className="h-3 w-3" />;
  }
}

function getEntryStyles(type: ContextEntry["type"], isTarget: boolean) {
  const baseStyles = isTarget
    ? "ring-2 ring-primary/50 bg-primary/5"
    : "opacity-70";

  switch (type) {
    case "user":
      return cn("border-l-blue-500", baseStyles);
    case "assistant":
      return cn("border-l-purple-500", baseStyles);
    case "system":
      return cn("border-l-gray-500", baseStyles);
    case "tool":
      return cn("border-l-orange-500", baseStyles);
    default:
      return cn("border-l-gray-500", baseStyles);
  }
}

function getIconStyles(type: ContextEntry["type"]) {
  switch (type) {
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

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const ContextEntryItem: FC<{ entry: ContextEntry }> = ({ entry }) => {
  const isThinking = entry.preview.startsWith("💭");

  return (
    <div
      className={cn(
        "border-l-2 pl-3 py-2 transition-all",
        getEntryStyles(entry.type, entry.isTarget),
      )}
    >
      <div className="flex items-start gap-2">
        <div
          className={cn(
            "flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5",
            getIconStyles(entry.type),
          )}
        >
          {getEntryIcon(entry.type)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-medium text-muted-foreground capitalize">
              {entry.type}
            </span>
            <span className="text-[10px] text-muted-foreground/60">
              {formatTime(entry.timestamp)}
            </span>
            {entry.isTarget && (
              <span className="text-[10px] bg-primary/20 text-primary px-1 rounded">
                current
              </span>
            )}
          </div>
          <p
            className={cn(
              "text-xs break-words",
              isThinking
                ? "text-muted-foreground/60 italic"
                : "text-foreground/80",
              entry.isTarget ? "line-clamp-none" : "line-clamp-2",
            )}
          >
            {entry.preview}
          </p>
        </div>
      </div>
    </div>
  );
};

export const ActivityEntryContext: FC<ActivityEntryContextProps> = ({
  projectId,
  sessionId,
  timestamp,
}) => {
  const { data, isLoading, error } = useQuery(
    activityContextQuery({
      projectId,
      sessionId,
      timestamp,
      before: 3,
      after: 3,
    }),
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2Icon className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="ml-2 text-xs text-muted-foreground">
          Loading context...
        </span>
      </div>
    );
  }

  if (error || !data?.entries?.length) {
    return (
      <div className="py-3 px-4 text-xs text-muted-foreground text-center">
        No context available
      </div>
    );
  }

  return (
    <div className="border-t border-border bg-muted/30">
      <div className="px-4 py-2 space-y-1">
        <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide mb-2">
          Conversation Context
        </div>
        <div className="space-y-1">
          {data.entries.map((entry, idx) => (
            <ContextEntryItem key={`${entry.timestamp}-${idx}`} entry={entry} />
          ))}
        </div>
        <div className="pt-2 flex justify-end">
          <Link
            to="/projects/$projectId/session"
            params={{ projectId }}
            search={{ sessionId }}
          >
            <Button variant="ghost" size="sm" className="h-6 text-xs gap-1">
              View full session
              <ExternalLinkIcon className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
