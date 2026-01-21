import { AlertCircleIcon } from "lucide-react";
import type { FC } from "react";
import { cn } from "../../lib/utils";
import { EntityText } from "./EntityRenderer";
import {
  hasErrorPatterns,
  isStackTraceContent,
  type ParsedToolResult,
  parseToolPreview,
} from "./toolResultParser";

interface ToolResultDisplayProps {
  preview: string;
  className?: string;
  showFullPreview?: boolean;
}

/**
 * Smart display component for tool results
 * Parses the preview and renders with appropriate formatting
 */
export const ToolResultDisplay: FC<ToolResultDisplayProps> = ({
  preview,
  className,
  showFullPreview = false,
}) => {
  const parsed = parseToolPreview(preview);

  if (!parsed) {
    // Not a tool result, render as entity text
    return (
      <span className={cn("text-sm text-foreground/80", className)}>
        <EntityText text={preview} />
      </span>
    );
  }

  return (
    <ParsedToolResultView
      parsed={parsed}
      rawPreview={preview}
      showFull={showFullPreview}
      className={className}
    />
  );
};

interface ParsedToolResultViewProps {
  parsed: ParsedToolResult;
  rawPreview: string;
  showFull?: boolean;
  className?: string;
}

const ParsedToolResultView: FC<ParsedToolResultViewProps> = ({
  parsed,
  rawPreview,
  showFull = false,
  className,
}) => {
  const { icon, summary, isError } = parsed;

  // Extract raw content from preview for expanded view
  const rawContent = rawPreview.replace(
    /^\[Tool(?:\s+Result|:\s*[^\]]+)\]\s*/,
    "",
  );

  return (
    <div className={cn("space-y-1", className)}>
      {/* Summary line */}
      <div
        className={cn(
          "flex items-center gap-1.5 text-sm",
          isError ? "text-red-600 dark:text-red-400" : "text-foreground/80",
        )}
      >
        {isError && <AlertCircleIcon className="h-3.5 w-3.5 flex-shrink-0" />}
        <span className="flex-shrink-0">{icon}</span>
        <span className={cn("truncate", isError && "font-medium")}>
          {summary}
        </span>
      </div>

      {/* Expanded content for errors or when showFull is true */}
      {(isError || showFull) && rawContent && rawContent !== summary && (
        <div
          className={cn(
            "mt-1 text-xs rounded-md p-2",
            isError
              ? "bg-red-500/10 border border-red-500/20"
              : "bg-muted/50 border border-border/50",
            isStackTraceContent(rawContent) && "font-mono whitespace-pre-wrap",
          )}
        >
          {isStackTraceContent(rawContent) ? (
            <pre className="overflow-x-auto text-xs">
              {rawContent.slice(0, 500)}
            </pre>
          ) : (
            <EntityText text={rawContent.slice(0, 300)} />
          )}
          {rawContent.length >
            (isStackTraceContent(rawContent) ? 500 : 300) && (
            <span className="text-muted-foreground">...</span>
          )}
        </div>
      )}
    </div>
  );
};

interface ToolBadgeProps {
  toolType: string;
  isError?: boolean;
  className?: string;
}

/**
 * Small badge showing tool type
 */
export const ToolBadge: FC<ToolBadgeProps> = ({
  toolType,
  isError,
  className,
}) => {
  const getToolColor = (type: string, hasError: boolean) => {
    if (hasError) return "bg-red-500/10 text-red-600 dark:text-red-400";

    switch (type) {
      case "read":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
      case "write":
        return "bg-green-500/10 text-green-600 dark:text-green-400";
      case "edit":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
      case "bash":
        return "bg-slate-500/10 text-slate-600 dark:text-slate-400";
      case "grep":
      case "glob":
        return "bg-purple-500/10 text-purple-600 dark:text-purple-400";
      case "webfetch":
      case "websearch":
        return "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400";
      case "mcp":
        return "bg-pink-500/10 text-pink-600 dark:text-pink-400";
      default:
        return "bg-gray-500/10 text-gray-600 dark:text-gray-400";
    }
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium uppercase",
        getToolColor(toolType, isError ?? false),
        className,
      )}
    >
      {toolType}
    </span>
  );
};

/**
 * Check if a preview string represents a tool result or tool use
 */
export function isToolPreview(preview: string): boolean {
  return preview.startsWith("[Tool");
}

/**
 * Format a preview for display - detect errors and format accordingly
 */
export function formatPreviewForDisplay(preview: string): {
  text: string;
  isError: boolean;
  isToolResult: boolean;
} {
  const parsed = parseToolPreview(preview);

  if (parsed) {
    return {
      text: parsed.summary,
      isError: parsed.isError,
      isToolResult: true,
    };
  }

  return {
    text: preview,
    isError: hasErrorPatterns(preview),
    isToolResult: false,
  };
}
