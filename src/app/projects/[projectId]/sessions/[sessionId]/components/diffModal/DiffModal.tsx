"use client";

import { FileText, GitBranch, Loader2, RefreshCcwIcon } from "lucide-react";
import type { FC } from "react";
import { useCallback, useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useGitBranches, useGitCommits, useGitDiff } from "../../hooks/useGit";
import { DiffViewer } from "./DiffViewer";
import type { DiffModalProps, DiffSummary, GitRef } from "./types";

interface DiffSummaryProps {
  summary: DiffSummary;
  className?: string;
}

const DiffSummaryComponent: FC<DiffSummaryProps> = ({ summary, className }) => {
  return (
    <div
      className={cn(
        "bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700",
        className,
      )}
    >
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-1">
          <FileText className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          <span className="font-medium">
            <span className="hidden sm:inline">
              {summary.filesChanged} files changed
            </span>
            <span className="sm:hidden">{summary.filesChanged} files</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          {summary.insertions > 0 && (
            <span className="text-green-600 dark:text-green-400 font-medium">
              +{summary.insertions}
            </span>
          )}
          {summary.deletions > 0 && (
            <span className="text-red-600 dark:text-red-400 font-medium">
              -{summary.deletions}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

interface RefSelectorProps {
  label: string;
  value: string;
  onValueChange: (value: GitRef["name"]) => void;
  refs: GitRef[];
}

const RefSelector: FC<RefSelectorProps> = ({
  label,
  value,
  onValueChange,
  refs,
}) => {
  const id = useId();
  const getRefIcon = (type: GitRef["type"]) => {
    switch (type) {
      case "branch":
        return <GitBranch className="h-4 w-4" />;
      case "commit":
        return <span className="text-xs">📝</span>;
      case "working":
        return <span className="text-xs">🚧</span>;
      default:
        return <GitBranch className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        {label}
      </label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="w-full sm:w-80">
          <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent id={id}>
          {refs.map((ref) => (
            <SelectItem key={ref.name} value={ref.name}>
              <div className="flex items-center gap-2">
                {getRefIcon(ref.type)}
                <span>{ref.displayName}</span>
                {ref.sha && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                    {ref.sha.substring(0, 7)}
                  </span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export const DiffModal: FC<DiffModalProps> = ({
  isOpen,
  onOpenChange,
  projectId,
  defaultCompareFrom = "HEAD",
  defaultCompareTo = "working",
}) => {
  const [compareFrom, setCompareFrom] = useState(defaultCompareFrom);
  const [compareTo, setCompareTo] = useState(defaultCompareTo);

  // API hooks
  const { data: branchesData, isLoading: isLoadingBranches } =
    useGitBranches(projectId);
  const { data: commitsData, isLoading: isLoadingCommits } =
    useGitCommits(projectId);
  const {
    mutate: getDiff,
    data: diffData,
    isPending: isDiffLoading,
    error: diffError,
  } = useGitDiff();

  // Transform branches and commits data to GitRef format
  const gitRefs: GitRef[] =
    branchesData?.success && branchesData.data
      ? [
          {
            name: "working" as const,
            type: "working" as const,
            displayName: "Uncommitted changes",
          },
          {
            name: "HEAD" as const,
            type: "commit" as const,
            displayName: "HEAD",
          },
          ...branchesData.data.map((branch) => ({
            name: `branch:${branch.name}` as const,
            type: "branch" as const,
            displayName: branch.name + (branch.current ? " (current)" : ""),
            sha: branch.commit,
          })),
          // Add commits from current branch
          ...(commitsData?.success && commitsData.data
            ? commitsData.data.map((commit) => ({
                name: `commit:${commit.sha}` as const,
                type: "commit" as const,
                displayName: `${commit.message.substring(0, 50)}${commit.message.length > 50 ? "..." : ""}`,
                sha: commit.sha,
              }))
            : []),
        ]
      : [];

  const loadDiff = useCallback(() => {
    if (compareFrom && compareTo && compareFrom !== compareTo) {
      getDiff({
        projectId,
        fromRef: compareFrom,
        toRef: compareTo,
      });
    }
  }, [compareFrom, compareTo, getDiff, projectId]);

  useEffect(() => {
    if (isOpen && compareFrom && compareTo) {
      loadDiff();
    }
  }, [isOpen, compareFrom, compareTo, loadDiff]);

  const handleCompare = () => {
    loadDiff();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl w-[95vw] h-[90vh] overflow-hidden flex flex-col px-2 md:px-8">
        <DialogHeader>
          <DialogTitle>Preview Changes</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            <RefSelector
              label="Compare from"
              value={compareFrom}
              onValueChange={setCompareFrom}
              refs={gitRefs.filter((ref) => ref.name !== "working")}
            />
            <RefSelector
              label="Compare to"
              value={compareTo}
              onValueChange={setCompareTo}
              refs={gitRefs}
            />
          </div>
          <Button
            onClick={handleCompare}
            disabled={
              isDiffLoading ||
              isLoadingBranches ||
              isLoadingCommits ||
              compareFrom === compareTo
            }
            className="sm:self-end w-full sm:w-auto"
          >
            {isDiffLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              <RefreshCcwIcon className="w-4 h-4" />
            )}
          </Button>
        </div>

        {diffError && (
          <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-600 dark:text-red-400 text-sm">
              {diffError.message}
            </p>
          </div>
        )}

        {diffData?.success && (
          <>
            <DiffSummaryComponent
              summary={{
                filesChanged: diffData.data.files.length,
                insertions: diffData.data.summary.totalAdditions,
                deletions: diffData.data.summary.totalDeletions,
                files: diffData.data.diffs.map((diff) => ({
                  filename: diff.file.filePath,
                  oldFilename: diff.file.oldPath,
                  isNew: diff.file.status === "added",
                  isDeleted: diff.file.status === "deleted",
                  isRenamed: diff.file.status === "renamed",
                  isBinary: false,
                  hunks: diff.hunks,
                  linesAdded: diff.file.additions,
                  linesDeleted: diff.file.deletions,
                })),
              }}
            />

            <div className="flex-1 overflow-auto space-y-6">
              {diffData.data.diffs.map((diff) => (
                <DiffViewer
                  key={diff.file.filePath}
                  fileDiff={{
                    filename: diff.file.filePath,
                    oldFilename: diff.file.oldPath,
                    isNew: diff.file.status === "added",
                    isDeleted: diff.file.status === "deleted",
                    isRenamed: diff.file.status === "renamed",
                    isBinary: false,
                    hunks: diff.hunks,
                    linesAdded: diff.file.additions,
                    linesDeleted: diff.file.deletions,
                  }}
                />
              ))}
            </div>
          </>
        )}

        {isDiffLoading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-2">
              <Loader2 className="w-8 h-8 animate-spin mx-auto" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Loading diff...
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
