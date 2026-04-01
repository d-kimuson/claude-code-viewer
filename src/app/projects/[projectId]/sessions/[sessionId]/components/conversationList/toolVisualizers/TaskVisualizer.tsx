import type { FC } from "react";
import { z } from "zod";
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

export const TaskVisualizer: FC<ToolVisualizerProps> = ({
  input,
  toolUseResult,
}) => {
  const parsedInput = inputSchema.safeParse(input);
  if (!parsedInput.success) return null;

  const parsedResult = toolUseResultSchema.safeParse(toolUseResult);

  return (
    <div className="rounded border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header with metadata */}
      <div className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2 flex-wrap">
        {parsedInput.data.subagent_type && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-medium">
            {parsedInput.data.subagent_type}
          </span>
        )}
        {parsedInput.data.description && (
          <span className="text-xs text-muted-foreground truncate">
            {parsedInput.data.description}
          </span>
        )}
      </div>

      {/* Prompt content */}
      <div className="px-3 py-2">
        <pre className="text-xs whitespace-pre-wrap break-words font-sans leading-relaxed">
          {parsedInput.data.prompt}
        </pre>
      </div>

      {/* Stats footer */}
      {parsedResult.success &&
        parsedResult.data.totalDurationMs !== undefined && (
          <div className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex items-center gap-3 text-xs text-muted-foreground">
            {parsedResult.data.totalDurationMs !== undefined && (
              <span>{formatDuration(parsedResult.data.totalDurationMs)}</span>
            )}
            {parsedResult.data.totalTokens !== undefined && (
              <span>
                {parsedResult.data.totalTokens.toLocaleString()} tokens
              </span>
            )}
            {parsedResult.data.totalToolUseCount !== undefined && (
              <span>{parsedResult.data.totalToolUseCount} tool uses</span>
            )}
          </div>
        )}

      {/* Loading state */}
      {toolUseResult === undefined && (
        <div className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 text-xs text-muted-foreground animate-pulse">
          Running...
        </div>
      )}
    </div>
  );
};
