import type { FC } from "react";
import { z } from "zod";
import { DiffViewer } from "../../diffModal/DiffViewer";
import type { DiffHunk, DiffLine, FileDiff } from "../../diffModal/types";
import { codeMonoClass } from "./constants";
import { ToolResultStatusBanner } from "./ToolResultStatusBanner";
import type { ToolVisualizerProps } from "./types";

const inputSchema = z.object({
  file_path: z.string(),
});

const structuredPatchSchema = z.array(
  z.object({
    oldStart: z.number(),
    oldLines: z.number(),
    newStart: z.number(),
    newLines: z.number(),
    lines: z.array(z.string()),
  }),
);

const toolUseResultSchema = z.object({
  filePath: z.string(),
  structuredPatch: structuredPatchSchema,
});

const convertPatchToHunks = (patches: z.infer<typeof structuredPatchSchema>): DiffHunk[] => {
  return patches.map((patch) => {
    let oldLine = patch.oldStart;
    let newLine = patch.newStart;

    const lines: DiffLine[] = patch.lines.map((line) => {
      const prefix = line[0];
      const content = line.slice(1);

      if (prefix === "-") {
        const result: DiffLine = {
          type: "deleted",
          oldLineNumber: oldLine,
          content,
        };
        oldLine++;
        return result;
      }
      if (prefix === "+") {
        const result: DiffLine = {
          type: "added",
          newLineNumber: newLine,
          content,
        };
        newLine++;
        return result;
      }
      const result: DiffLine = {
        type: "unchanged",
        oldLineNumber: oldLine,
        newLineNumber: newLine,
        content,
      };
      oldLine++;
      newLine++;
      return result;
    });

    return {
      oldStart: patch.oldStart,
      newStart: patch.newStart,
      lines,
    };
  });
};

export const EditVisualizer: FC<ToolVisualizerProps> = ({ input, output, toolUseResult }) => {
  const parsedInput = inputSchema.safeParse(input);
  if (!parsedInput.success) return null;

  const parsedResult = toolUseResultSchema.safeParse(toolUseResult);

  if (!parsedResult.success) {
    return (
      <div className="rounded border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div
          className={`px-3 py-2 bg-gray-50 dark:bg-gray-800 ${codeMonoClass} text-xs font-medium`}
        >
          {parsedInput.data.file_path}
        </div>
        {toolUseResult === undefined && (
          <div className="px-3 py-4 text-xs text-muted-foreground animate-pulse text-center">
            Applying edit...
          </div>
        )}
        <ToolResultStatusBanner output={output} />
      </div>
    );
  }

  const hunks = convertPatchToHunks(parsedResult.data.structuredPatch);
  let linesAdded = 0;
  let linesDeleted = 0;
  for (const hunk of hunks) {
    for (const line of hunk.lines) {
      if (line.type === "added") linesAdded++;
      if (line.type === "deleted") linesDeleted++;
    }
  }

  const fileDiff: FileDiff = {
    filename: parsedResult.data.filePath,
    isNew: false,
    isDeleted: false,
    isRenamed: false,
    isBinary: false,
    hunks,
    linesAdded,
    linesDeleted,
  };

  return (
    <div className="overflow-hidden">
      <DiffViewer fileDiff={fileDiff} />
      <ToolResultStatusBanner output={output} />
    </div>
  );
};
