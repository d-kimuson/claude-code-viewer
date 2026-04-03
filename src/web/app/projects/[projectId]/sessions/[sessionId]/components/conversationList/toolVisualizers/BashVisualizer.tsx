import type { FC } from "react";
import { z } from "zod";
import { codeMonoClass } from "./constants";
import type { ToolVisualizerProps } from "./types";

const inputSchema = z.object({
  command: z.string(),
  description: z.string().optional(),
});

const toolUseResultSchema = z.object({
  stdout: z.string(),
  stderr: z.string(),
  interrupted: z.boolean(),
});

export const BashVisualizer: FC<ToolVisualizerProps> = ({ input, toolUseResult }) => {
  const parsedInput = inputSchema.safeParse(input);
  if (!parsedInput.success) return null;

  const parsedResult = toolUseResultSchema.safeParse(toolUseResult);
  // result can be null (not yet received) - that's fine, show command only

  return (
    <div
      className={`${codeMonoClass} text-xs rounded bg-gray-900 dark:bg-gray-950 text-gray-100 overflow-hidden`}
    >
      {/* Command line */}
      <div className="px-3 py-2 bg-gray-800 dark:bg-gray-900 border-b border-gray-700 flex items-start gap-2">
        <span className="text-green-400 select-none flex-shrink-0">$</span>
        <span className="whitespace-pre-wrap break-all">{parsedInput.data.command}</span>
      </div>

      {/* stdout */}
      {parsedResult.success && parsedResult.data.stdout && (
        <div className="px-3 py-2 whitespace-pre-wrap break-words max-h-96 overflow-y-auto">
          {parsedResult.data.stdout}
        </div>
      )}

      {/* stderr */}
      {parsedResult.success && parsedResult.data.stderr && (
        <div className="px-3 py-2 text-red-400 border-t border-gray-700 whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
          {parsedResult.data.stderr}
        </div>
      )}

      {/* interrupted indicator */}
      {parsedResult.success && parsedResult.data.interrupted && (
        <div className="px-3 py-1 text-yellow-400 border-t border-gray-700 text-xs">
          Process interrupted
        </div>
      )}

      {/* Loading state - result not yet available */}
      {!parsedResult.success && toolUseResult === undefined && (
        <div className="px-3 py-2 text-gray-500 animate-pulse">Running...</div>
      )}
    </div>
  );
};
