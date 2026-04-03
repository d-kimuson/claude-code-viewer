import type { FC } from "react";
import { z } from "zod";
import { DiffViewer } from "../../diffModal/DiffViewer";
import type { DiffHunk, DiffLine, FileDiff } from "../../diffModal/types";
import type { ToolVisualizerProps } from "./types";

const inputSchema = z.object({
  file_path: z.string(),
  old_string: z.string().optional(),
  new_string: z.string().optional(),
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

// Build a structured patch from old_string/new_string (for permission request previews)
const buildPatchFromStrings = (
  oldStr: string,
  newStr: string,
): z.infer<typeof structuredPatchSchema> => {
  const oldLines = oldStr.split("\n");
  const newLines = newStr.split("\n");
  return [
    {
      oldStart: 1,
      oldLines: oldLines.length,
      newStart: 1,
      newLines: newLines.length,
      lines: [...oldLines.map((line) => `-${line}`), ...newLines.map((line) => `+${line}`)],
    },
  ];
};

const renderDiff = (filename: string, patches: z.infer<typeof structuredPatchSchema>) => {
  const hunks = convertPatchToHunks(patches);
  let linesAdded = 0;
  let linesDeleted = 0;
  for (const hunk of hunks) {
    for (const line of hunk.lines) {
      if (line.type === "added") linesAdded++;
      if (line.type === "deleted") linesDeleted++;
    }
  }

  const fileDiff: FileDiff = {
    filename,
    isNew: false,
    isDeleted: false,
    isRenamed: false,
    isBinary: false,
    hunks,
    linesAdded,
    linesDeleted,
  };

  return <DiffViewer fileDiff={fileDiff} />;
};

export const EditVisualizer: FC<ToolVisualizerProps> = ({ input, toolUseResult }) => {
  const parsedInput = inputSchema.safeParse(input);
  if (!parsedInput.success) return null;

  // Prefer toolUseResult (has full structured patch with context lines)
  const parsedResult = toolUseResultSchema.safeParse(toolUseResult);
  if (parsedResult.success) {
    return renderDiff(parsedResult.data.filePath, parsedResult.data.structuredPatch);
  }

  // Fallback: build diff from old_string/new_string in input (permission request preview)
  const { old_string: oldStr, new_string: newStr } = parsedInput.data;
  if (oldStr !== undefined && newStr !== undefined) {
    return renderDiff(parsedInput.data.file_path, buildPatchFromStrings(oldStr, newStr));
  }

  // No diff data available — show loading state
  return (
    <div className="rounded border border-gray-200 dark:border-gray-700">
      <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 font-mono text-xs font-medium">
        {parsedInput.data.file_path}
      </div>
      {toolUseResult === undefined && (
        <div className="px-3 py-4 text-xs text-muted-foreground animate-pulse text-center">
          Applying edit...
        </div>
      )}
    </div>
  );
};
