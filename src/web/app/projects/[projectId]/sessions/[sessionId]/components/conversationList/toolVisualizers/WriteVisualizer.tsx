import type { FC } from "react";
import { z } from "zod";
import { codeMonoClass } from "./constants";
import { ToolResultStatusBanner } from "./ToolResultStatusBanner";
import type { ToolVisualizerProps } from "./types";

const inputSchema = z.object({
  file_path: z.string(),
  content: z.string(),
});

export const WriteVisualizer: FC<ToolVisualizerProps> = ({ input, output }) => {
  const parsedInput = inputSchema.safeParse(input);
  if (!parsedInput.success) return null;

  return (
    <div className="rounded border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div
        className={`px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 ${codeMonoClass} text-xs font-medium`}
      >
        {parsedInput.data.file_path}
      </div>

      {/* Loading state */}
      {output === undefined && (
        <div className="px-3 py-4 text-xs text-muted-foreground animate-pulse text-center">
          Writing file...
        </div>
      )}

      {/* Result status */}
      <ToolResultStatusBanner output={output} showSuccess />
    </div>
  );
};
