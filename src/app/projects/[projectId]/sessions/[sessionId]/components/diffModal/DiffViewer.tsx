"use client";

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

const DiffHunkComponent: FC<DiffHunkProps> = ({ hunk }) => {
  return (
    <div className="relative flex overflow-x-auto">
      {/* 行番号列（固定） */}
      <div className="flex-shrink-0 sticky left-0 z-10 bg-white dark:bg-gray-900">
        {/* 旧行番号列 */}
        <div className="float-left w-10 bg-gray-50 dark:bg-gray-800/50 border-r border-gray-200 dark:border-gray-700">
          {hunk.lines.map((line, index) => (
            <div
              key={`old-${line.oldLineNumber}-${index}`}
              className="px-2 py-1 text-sm text-gray-400 dark:text-gray-600 font-mono text-right h-[28px]"
            >
              {line.type !== "added" &&
              line.type !== "hunk" &&
              line.oldLineNumber
                ? line.oldLineNumber
                : "　"}
            </div>
          ))}
        </div>
        {/* 新行番号列 */}
        <div className="float-left w-10 bg-gray-50 dark:bg-gray-800/50 border-r border-gray-200 dark:border-gray-700">
          {hunk.lines.map((line, index) => (
            <div
              key={`new-${line.newLineNumber}-${index}`}
              className="px-2 py-1 text-sm text-gray-400 dark:text-gray-600 font-mono text-right h-[28px]"
            >
              {line.type !== "deleted" &&
              line.type !== "hunk" &&
              line.newLineNumber
                ? line.newLineNumber
                : "　"}
            </div>
          ))}
        </div>
      </div>

      {/* コンテンツ列（スクロール可能） */}
      <div className="flex-1 min-w-0">
        {hunk.lines.map((line, index) => (
          <div
            key={`content-${line.content}-${line.oldLineNumber}-${line.newLineNumber}-${index}`}
            className={cn("flex border-l-4", {
              "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800/50 border-l-green-400":
                line.type === "added",
              "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800/50 border-l-red-400":
                line.type === "deleted",
              "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/50 border-l-blue-400":
                line.type === "hunk",
              "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 border-l-transparent":
                line.type === "unchanged",
            })}
          >
            <div className="flex-1 px-2 py-1">
              <span className="font-mono text-sm whitespace-pre block">
                <span
                  className={cn({
                    "text-green-600 dark:text-green-400": line.type === "added",
                    "text-red-600 dark:text-red-400": line.type === "deleted",
                    "text-blue-600 dark:text-blue-400 font-medium":
                      line.type === "hunk",
                    "text-gray-400 dark:text-gray-600":
                      line.type === "unchanged",
                  })}
                >
                  {line.type === "added"
                    ? "+"
                    : line.type === "deleted"
                      ? "-"
                      : line.type === "hunk"
                        ? ""
                        : " "}
                </span>
                {line.content || " "}
              </span>
            </div>
          </div>
        ))}
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

  const getFileStatusText = () => {
    if (fileDiff.isNew) return "added";
    if (fileDiff.isDeleted) return "deleted";
    if (fileDiff.isRenamed) return `renamed from ${fileDiff.oldFilename ?? ""}`;
    return "modified";
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
      className="w-full bg-gray-50 dark:bg-gray-800 px-4 py-4 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors min-h-[4rem]"
    >
      <div className="w-full space-y-1">
        {/* Row 1: icon, status, and stats */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isCollapsed ? (
              <ChevronRightIcon className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDownIcon className="w-4 h-4 text-gray-500" />
            )}
            <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs font-mono">
              {getFileStatusIcon()}
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {getFileStatusText()}
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
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
        </div>

        {/* Row 2: filename with copy button */}
        <div className="w-full flex items-center gap-2">
          <span className="font-mono text-sm font-medium text-black dark:text-white text-left truncate flex-1 min-w-0">
            {fileDiff.filename}
          </span>
          <Button
            onClick={handleCopyFilename}
            variant="ghost"
            size="sm"
            className="flex-shrink-0 p-1 h-6 w-6 hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            <CopyIcon className="w-3 h-3 text-gray-500 dark:text-gray-400" />
          </Button>
        </div>
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
          "border border-gray-200 dark:border-gray-700 rounded-lg",
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
        "border border-gray-200 dark:border-gray-700 rounded-lg",
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
          {fileDiff.hunks.map((hunk, index) => (
            <DiffHunkComponent
              key={`${hunk.oldStart}-${hunk.newStart}-${index}`}
              hunk={hunk}
            />
          ))}
        </div>
      )}
    </div>
  );
};
