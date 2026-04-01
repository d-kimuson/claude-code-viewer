import { ChevronDownIcon, ChevronRightIcon, CopyIcon } from "lucide-react";
import type { FC } from "react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "../../../../../../../components/ui/button";
import type { DiffHunk, FileDiff } from "./types";

interface DiffViewerProps {
  fileDiff: FileDiff;
  className?: string;
}

interface DiffHunkProps {
  hunk: DiffHunk;
}

const diffMonoClass =
  '[font-family:"Fira_Code","Fira_Mono",Menlo,Consolas,"DejaVu_Sans_Mono",monospace]';

const getRowClasses = (type: DiffHunk["lines"][number]["type"]) => {
  return cn({
    "bg-green-50 dark:bg-green-950/30": type === "added",
    "bg-red-50 dark:bg-red-950/30": type === "deleted",
    "bg-blue-50 dark:bg-blue-950/30": type === "hunk",
    "bg-white dark:bg-gray-900": type === "unchanged" || type === "context",
  });
};

const getStickyCellClasses = (type: DiffHunk["lines"][number]["type"]) => {
  return cn({
    "bg-green-50 dark:bg-green-950": type === "added",
    "bg-red-50 dark:bg-red-950": type === "deleted",
    "bg-blue-50 dark:bg-blue-950": type === "hunk",
    "bg-white dark:bg-gray-900": type === "unchanged" || type === "context",
  });
};

const DiffHunkComponent: FC<DiffHunkProps> = ({ hunk }) => {
  return (
    <div className="relative flex">
      <div className="w-20 shrink-0">
        <div>
          {hunk.lines.map((line) => (
            <div
              key={`gutter-${line.oldLineNumber ?? ""}-${line.newLineNumber ?? ""}`}
              className={cn(
                "grid grid-cols-[2.5rem_2.5rem] border-r border-l-4",
                diffMonoClass,
                getStickyCellClasses(line.type),
                {
                  "border-green-200 border-l-green-400 dark:border-green-800/50":
                    line.type === "added",
                  "border-red-200 border-l-red-400 dark:border-red-800/50":
                    line.type === "deleted",
                  "border-blue-200 border-l-blue-400 dark:border-blue-800/50":
                    line.type === "hunk",
                  "border-gray-200 border-l-transparent dark:border-gray-700":
                    line.type === "unchanged" || line.type === "context",
                },
              )}
            >
              <div className="border-r px-1 py-0.5 text-right text-xs leading-tight tabular-nums border-gray-200 dark:border-gray-700">
                {line.type !== "added" &&
                line.type !== "hunk" &&
                line.oldLineNumber
                  ? line.oldLineNumber
                  : "\u00A0"}
              </div>
              <div className="px-1 py-0.5 text-right text-xs leading-tight tabular-nums">
                {line.type !== "deleted" &&
                line.type !== "hunk" &&
                line.newLineNumber
                  ? line.newLineNumber
                  : "\u00A0"}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="min-w-0 flex-1 overflow-x-auto">
        <div className="inline-block w-max min-w-full align-top">
          {hunk.lines.map((line) => (
            <div
              data-slot="diff-row"
              key={`content-${line.oldLineNumber ?? ""}-${line.newLineNumber ?? ""}`}
              className={cn(
                "relative min-w-full border-l-4",
                getRowClasses(line.type),
                {
                  "border-green-200 border-l-green-400 dark:border-green-800/50":
                    line.type === "added",
                  "border-red-200 border-l-red-400 dark:border-red-800/50":
                    line.type === "deleted",
                  "border-blue-200 border-l-blue-400 dark:border-blue-800/50":
                    line.type === "hunk",
                  "border-gray-100 border-l-transparent dark:border-gray-800":
                    line.type === "unchanged" || line.type === "context",
                },
              )}
            >
              <div
                data-slot="diff-row-content"
                className={cn(
                  "relative min-w-0 px-2 py-0.5 pl-7 text-xs leading-tight whitespace-pre",
                  diffMonoClass,
                )}
              >
                <span
                  data-slot="diff-sign"
                  className={cn("absolute left-2 top-0.5 w-4 text-center", {
                    "text-green-600 dark:text-green-400": line.type === "added",
                    "text-red-600 dark:text-red-400": line.type === "deleted",
                    "font-medium text-blue-600 dark:text-blue-400":
                      line.type === "hunk",
                    "text-gray-400 dark:text-gray-600":
                      line.type === "unchanged" || line.type === "context",
                  })}
                >
                  {line.type === "added"
                    ? "+"
                    : line.type === "deleted"
                      ? "-"
                      : line.type === "hunk"
                        ? "@"
                        : "\u00A0"}
                </span>
                <span className="inline-block w-max min-w-full pr-4">
                  {line.content || " "}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

interface FileHeaderProps {
  fileDiff: FileDiff;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const FileHeader: FC<FileHeaderProps> = ({
  fileDiff,
  isCollapsed,
  onToggleCollapse,
}) => {
  const getFileStatusIcon = () => {
    if (fileDiff.isNew)
      return <span className="text-green-600 dark:text-green-400">A</span>;
    if (fileDiff.isDeleted)
      return <span className="text-red-600 dark:text-red-400">D</span>;
    if (fileDiff.isRenamed)
      return <span className="text-blue-600 dark:text-blue-400">R</span>;
    return <span className="text-gray-600 dark:text-gray-400">M</span>;
  };

  const handleCopyFilename = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(fileDiff.filename);
      toast.success("ファイル名をコピーしました");
    } catch (err) {
      console.error("Failed to copy filename:", err);
      toast.error("ファイル名のコピーに失敗しました");
    }
  };

  return (
    <Button
      onClick={onToggleCollapse}
      className="w-full bg-gray-50 dark:bg-gray-800 px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors sticky top-0 z-20"
    >
      <div className="w-full flex items-center gap-2">
        {isCollapsed ? (
          <ChevronRightIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
        ) : (
          <ChevronDownIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
        )}
        <div
          className={cn(
            "w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs flex-shrink-0",
            diffMonoClass,
          )}
        >
          {getFileStatusIcon()}
        </div>
        <span
          className={cn(
            "text-xs font-medium text-black dark:text-white text-left truncate flex-1 min-w-0",
            diffMonoClass,
          )}
        >
          {fileDiff.filename}
        </span>
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
          {fileDiff.linesAdded > 0 && (
            <span className="text-green-600 dark:text-green-400">
              +{fileDiff.linesAdded}
            </span>
          )}
          {fileDiff.linesDeleted > 0 && (
            <span className="text-red-600 dark:text-red-400">
              -{fileDiff.linesDeleted}
            </span>
          )}
        </div>
        <Button
          onClick={handleCopyFilename}
          variant="ghost"
          size="sm"
          className="flex-shrink-0 p-1 h-5 w-5 hover:bg-gray-200 dark:hover:bg-gray-600"
        >
          <CopyIcon className="w-3 h-3 text-gray-500 dark:text-gray-400" />
        </Button>
      </div>
      {fileDiff.isBinary && (
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-left">
          Binary file (content not shown)
        </div>
      )}
    </Button>
  );
};

export const DiffViewer: FC<DiffViewerProps> = ({ fileDiff, className }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  if (fileDiff.isBinary) {
    return (
      <div
        className={cn(
          "overflow-hidden border border-gray-200 dark:border-gray-700 rounded-lg",
          className,
        )}
      >
        <FileHeader
          fileDiff={fileDiff}
          isCollapsed={isCollapsed}
          onToggleCollapse={toggleCollapse}
        />
        {!isCollapsed && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
            Binary file cannot be displayed
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden border border-gray-200 dark:border-gray-700 rounded-lg",
        className,
      )}
    >
      <FileHeader
        fileDiff={fileDiff}
        isCollapsed={isCollapsed}
        onToggleCollapse={toggleCollapse}
      />
      {!isCollapsed && (
        <div className="border-t border-gray-200 dark:border-gray-700">
          {fileDiff.hunks.map((hunk) => (
            <DiffHunkComponent
              key={`${hunk.oldStart}-${hunk.newStart}`}
              hunk={hunk}
            />
          ))}
        </div>
      )}
    </div>
  );
};
