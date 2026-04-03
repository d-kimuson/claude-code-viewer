import { AlertCircleIcon, ChevronDownIcon } from "lucide-react";
import type { FC } from "react";
import { z } from "zod";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/web/components/ui/collapsible";
import { cn } from "@/web/utils";
import { extractOutputInfo } from "./ToolResultStatusBanner";
import type { ToolVisualizerProps } from "./types";

const inputSchema = z.object({
  prompt: z.string(),
  description: z.string().optional(),
  subagent_type: z.string().optional(),
});

const toolUseResultSchema = z.object({
  totalDurationMs: z.number().optional(),
  totalTokens: z.number().optional(),
  totalToolUseCount: z.number().optional(),
});

const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
};

type TaskResultSectionProps = {
  output: unknown;
};

const TaskResultSection: FC<TaskResultSectionProps> = ({ output }) => {
  const { text, isError } = extractOutputInfo(output);
  if (text === null) return null;

  return (
    <Collapsible>
      <div
        className={cn(
          "border-t",
          isError
            ? "border-red-200 dark:border-red-800/50"
            : "border-gray-200 dark:border-gray-700",
        )}
      >
        <CollapsibleTrigger className="flex items-center gap-1.5 w-full text-left px-3 py-1.5 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group">
          {isError ? (
            <AlertCircleIcon className="w-3.5 h-3.5 flex-shrink-0 text-red-600 dark:text-red-400" />
          ) : null}
          <span
            className={cn(
              "text-xs font-medium",
              isError ? "text-red-700 dark:text-red-400" : "text-muted-foreground",
            )}
          >
            Result
          </span>
          <ChevronDownIcon className="w-3 h-3 ml-auto transition-transform text-muted-foreground group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div
            className={cn(
              "px-3 py-2 max-h-64 overflow-y-auto",
              isError && "bg-red-50/50 dark:bg-red-950/20",
            )}
          >
            <pre
              className={cn(
                "text-xs whitespace-pre-wrap break-words",
                isError ? "text-red-700 dark:text-red-400" : "text-foreground",
              )}
            >
              {text}
            </pre>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

export const TaskVisualizer: FC<ToolVisualizerProps> = ({ input, output, toolUseResult }) => {
  const parsedInput = inputSchema.safeParse(input);
  if (!parsedInput.success) return null;

  const parsedResult = toolUseResultSchema.safeParse(toolUseResult);
  const hasSubagentType =
    parsedInput.data.subagent_type !== undefined && parsedInput.data.subagent_type !== "";
  const hasDescription =
    parsedInput.data.description !== undefined && parsedInput.data.description !== "";

  return (
    <div className="rounded border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header with metadata */}
      <div className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2 flex-wrap">
        {hasSubagentType ? (
          <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-medium">
            {parsedInput.data.subagent_type}
          </span>
        ) : null}
        {hasDescription ? (
          <span className="text-xs text-muted-foreground truncate">
            {parsedInput.data.description}
          </span>
        ) : null}
      </div>

      {/* Prompt content */}
      <div className="px-3 py-2">
        <pre className="text-xs whitespace-pre-wrap break-words font-sans leading-relaxed">
          {parsedInput.data.prompt}
        </pre>
      </div>

      {/* Stats footer */}
      {parsedResult.success && parsedResult.data.totalDurationMs !== undefined && (
        <div className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex items-center gap-3 text-xs text-muted-foreground">
          {parsedResult.data.totalDurationMs !== undefined && (
            <span>{formatDuration(parsedResult.data.totalDurationMs)}</span>
          )}
          {parsedResult.data.totalTokens !== undefined && (
            <span>{parsedResult.data.totalTokens.toLocaleString()} tokens</span>
          )}
          {parsedResult.data.totalToolUseCount !== undefined && (
            <span>{parsedResult.data.totalToolUseCount} tool uses</span>
          )}
        </div>
      )}

      {/* Result output */}
      <TaskResultSection output={output} />

      {/* Loading state */}
      {toolUseResult === undefined && (
        <div className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 text-xs text-muted-foreground animate-pulse">
          Running...
        </div>
      )}
    </div>
  );
};
