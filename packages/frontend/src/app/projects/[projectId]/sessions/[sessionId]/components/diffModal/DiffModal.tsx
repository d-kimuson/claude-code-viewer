import { Trans, useLingui } from "@lingui/react";
import {
  ChevronDown,
  ChevronUp,
  FileText,
  GitBranch,
  Loader2,
  RefreshCcwIcon,
} from "lucide-react";
import type { FC } from "react";
import { useCallback, useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  useCommitAndPush,
  useCommitFiles,
  useGitBranches,
  useGitCommits,
  useGitDiff,
  usePushCommits,
} from "../../hooks/useGit";
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
        "bg-gray-50 dark:bg-gray-800 rounded-lg p-2 border border-gray-200 dark:border-gray-700",
        className,
      )}
    >
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-1">
          <FileText className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          <span className="font-medium">
            <span className="hidden sm:inline">
              {summary.filesChanged}{" "}
              <Trans id="diff.files.changed" message="files changed" />
            </span>
            <span className="sm:hidden">
              {summary.filesChanged} <Trans id="diff.files" message="files" />
            </span>
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
    <div className="space-y-1">
      <label
        htmlFor={id}
        className="text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        {label}
      </label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="w-full sm:w-80">
          <SelectValue />
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
  const { i18n } = useLingui();
  const commitMessageId = useId();
  const [compareFrom, setCompareFrom] = useState(defaultCompareFrom);
  const [compareTo, setCompareTo] = useState(defaultCompareTo);

  // File selection state (FR-002: all selected by default)
  const [selectedFiles, setSelectedFiles] = useState<Map<string, boolean>>(
    new Map(),
  );

  // Commit message state
  const [commitMessage, setCommitMessage] = useState("");

  // Commit section collapse state (default: collapsed)
  const [isCommitSectionExpanded, setIsCommitSectionExpanded] = useState(false);

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
  const commitMutation = useCommitFiles(projectId);
  const pushMutation = usePushCommits(projectId);
  const commitAndPushMutation = useCommitAndPush(projectId);

  // Transform branches and commits data to GitRef format
  const gitRefs: GitRef[] =
    branchesData?.success && branchesData.data
      ? [
          {
            name: "working" as const,
            type: "working" as const,
            displayName: i18n._("Uncommitted changes"),
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

  // Initialize file selection when diff data changes (FR-002: all selected by default)
  useEffect(() => {
    if (diffData?.success && diffData.data.files.length > 0) {
      const initialSelection = new Map(
        diffData.data.files.map((file) => [file.filePath, true]),
      );
      setSelectedFiles(initialSelection);
    }
  }, [diffData]);

  useEffect(() => {
    if (isOpen && compareFrom && compareTo) {
      loadDiff();
    }
  }, [isOpen, compareFrom, compareTo, loadDiff]);

  const handleCompare = () => {
    loadDiff();
  };

  // File selection handlers
  const handleToggleFile = (filePath: string) => {
    setSelectedFiles((prev) => {
      const next = new Map(prev);
      const newValue = !prev.get(filePath);
      next.set(filePath, newValue);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (diffData?.success && diffData.data.files.length > 0) {
      setSelectedFiles(
        new Map(diffData.data.files.map((file) => [file.filePath, true])),
      );
    }
  };

  const handleDeselectAll = () => {
    if (diffData?.success && diffData.data.files.length > 0) {
      setSelectedFiles(
        new Map(diffData.data.files.map((file) => [file.filePath, false])),
      );
    }
  };

  // Commit handler
  const handleCommit = async () => {
    const selected = Array.from(selectedFiles.entries())
      .filter(([_, isSelected]) => isSelected)
      .map(([path]) => path);

    console.log(
      "[DiffModal.handleCommit] Selected files state:",
      selectedFiles,
    );
    console.log("[DiffModal.handleCommit] Filtered selected files:", selected);
    console.log(
      "[DiffModal.handleCommit] Total files:",
      diffData?.success ? diffData.data.files.length : 0,
    );

    try {
      const result = await commitMutation.mutateAsync({
        files: selected,
        message: commitMessage,
      });

      console.log("[DiffModal.handleCommit] Commit result:", result);

      if (result.success) {
        toast.success(
          `Committed ${result.filesCommitted} files (${result.commitSha.slice(0, 7)})`,
        );
        setCommitMessage(""); // Reset message
        // Reload diff to show updated state
        loadDiff();
      } else {
        toast.error(result.error, { description: result.details });
      }
    } catch (_error) {
      console.error("[DiffModal.handleCommit] Error:", _error);
      toast.error(i18n._("Failed to commit"));
    }
  };

  // Push handler
  const handlePush = async () => {
    try {
      const result = await pushMutation.mutateAsync();

      console.log("[DiffModal.handlePush] Push result:", result);

      if (result.success) {
        toast.success(`Pushed to ${result.remote}/${result.branch}`);
      } else {
        toast.error(result.error, { description: result.details });
      }
    } catch (_error) {
      console.error("[DiffModal.handlePush] Error:", _error);
      toast.error(i18n._("Failed to push"));
    }
  };

  // Commit and Push handler
  const handleCommitAndPush = async () => {
    const selected = Array.from(selectedFiles.entries())
      .filter(([_, isSelected]) => isSelected)
      .map(([path]) => path);

    console.log("[DiffModal.handleCommitAndPush] Selected files:", selected);

    try {
      const result = await commitAndPushMutation.mutateAsync({
        files: selected,
        message: commitMessage,
      });

      console.log("[DiffModal.handleCommitAndPush] Result:", result);

      if (result.success) {
        toast.success(`Committed and pushed (${result.commitSha.slice(0, 7)})`);
        setCommitMessage(""); // Reset message
        // Reload diff to show updated state
        loadDiff();
      } else if (
        result.success === false &&
        "commitSucceeded" in result &&
        result.commitSucceeded
      ) {
        // Partial failure: commit succeeded, push failed
        toast.warning(
          `Committed (${result.commitSha?.slice(0, 7)}), but push failed: ${result.error}`,
          {
            action: {
              label: i18n._("Retry Push"),
              onClick: handlePush,
            },
          },
        );
        setCommitMessage(""); // Reset message since commit succeeded
        // Reload diff to show updated state (commit succeeded)
        loadDiff();
      } else {
        toast.error(result.error, { description: result.details });
      }
    } catch (_error) {
      console.error("[DiffModal.handleCommitAndPush] Error:", _error);
      toast.error(i18n._("Failed to commit and push"));
    }
  };

  // Validation
  const selectedCount = Array.from(selectedFiles.values()).filter(
    Boolean,
  ).length;
  const isCommitDisabled =
    selectedCount === 0 ||
    commitMessage.trim().length === 0 ||
    commitMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl w-[95vw] h-[90vh] overflow-hidden flex flex-col px-2 md:px-8">
        <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
          <div className="flex flex-col sm:flex-row gap-2 flex-1">
            <RefSelector
              label={i18n._("Compare from")}
              value={compareFrom}
              onValueChange={setCompareFrom}
              refs={gitRefs.filter((ref) => ref.name !== "working")}
            />
            <RefSelector
              label={i18n._("Compare to")}
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
                <Trans id="common.loading" message="Loading..." />
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
          <div className="flex-1 overflow-auto">
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
              className="mb-3"
            />

            {/* Commit UI Section */}
            {compareTo === "working" && (
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg mb-4 border border-gray-200 dark:border-gray-700">
                {/* Section header with toggle */}
                <button
                  type="button"
                  onClick={() =>
                    setIsCommitSectionExpanded(!isCommitSectionExpanded)
                  }
                  className="w-full flex items-center justify-between p-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors rounded-t-lg"
                >
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    <Trans id="diff.commit.changes" message="Commit Changes" />
                  </span>
                  {isCommitSectionExpanded ? (
                    <ChevronUp className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  )}
                </button>

                {/* Collapsible content */}
                {isCommitSectionExpanded && (
                  <div className="p-4 pt-0 space-y-3">
                    {/* File selection controls */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleSelectAll}
                          disabled={commitMutation.isPending}
                        >
                          <Trans id="diff.select.all" message="Select All" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleDeselectAll}
                          disabled={commitMutation.isPending}
                        >
                          <Trans
                            id="diff.deselect.all"
                            message="Deselect All"
                          />
                        </Button>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {selectedCount} / {diffData.data.files.length} files
                          selected
                        </span>
                      </div>
                    </div>

                    {/* File list with checkboxes */}
                    <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded p-2">
                      {diffData.data.files.map((file) => (
                        <div
                          key={file.filePath}
                          className="flex items-center gap-2"
                        >
                          <Checkbox
                            id={`file-${file.filePath}`}
                            checked={selectedFiles.get(file.filePath) ?? false}
                            onCheckedChange={() =>
                              handleToggleFile(file.filePath)
                            }
                            disabled={commitMutation.isPending}
                          />
                          <label
                            htmlFor={`file-${file.filePath}`}
                            className="text-sm font-mono cursor-pointer flex-1"
                          >
                            {file.filePath}
                          </label>
                        </div>
                      ))}
                    </div>

                    {/* Commit message input */}
                    <div className="space-y-2">
                      <label
                        htmlFor={commitMessageId}
                        className="text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        <Trans
                          id="diff.commit.message"
                          message="Commit message"
                        />
                      </label>
                      <Textarea
                        id={commitMessageId}
                        placeholder="Enter commit message..."
                        value={commitMessage}
                        onChange={(e) => setCommitMessage(e.target.value)}
                        disabled={commitMutation.isPending}
                        className="resize-none"
                        rows={3}
                      />
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        onClick={handleCommit}
                        disabled={isCommitDisabled}
                        className="w-full sm:w-auto"
                      >
                        {commitMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            <Trans
                              id="diff.committing"
                              message="Committing..."
                            />
                          </>
                        ) : (
                          <Trans id="diff.commit" message="Commit" />
                        )}
                      </Button>
                      <Button
                        onClick={handlePush}
                        disabled={pushMutation.isPending}
                        variant="outline"
                        className="w-full sm:w-auto"
                      >
                        {pushMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            <Trans id="diff.pushing" message="Pushing..." />
                          </>
                        ) : (
                          <Trans id="diff.push" message="Push" />
                        )}
                      </Button>
                      <Button
                        onClick={handleCommitAndPush}
                        disabled={
                          isCommitDisabled || commitAndPushMutation.isPending
                        }
                        variant="secondary"
                        className="w-full sm:w-auto"
                      >
                        {commitAndPushMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            <Trans
                              id="diff.committing.pushing"
                              message="Committing & Pushing..."
                            />
                          </>
                        ) : (
                          <Trans
                            id="diff.commit.push"
                            message="Commit & Push"
                          />
                        )}
                      </Button>
                      {isCommitDisabled &&
                        !commitMutation.isPending &&
                        !commitAndPushMutation.isPending && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {selectedCount === 0 ? (
                              <Trans
                                id="diff.select.file"
                                message="Select at least one file"
                              />
                            ) : (
                              <Trans
                                id="diff.enter.message"
                                message="Enter a commit message"
                              />
                            )}
                          </span>
                        )}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-3">
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
          </div>
        )}

        {isDiffLoading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-2">
              <Loader2 className="w-8 h-8 animate-spin mx-auto" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                <Trans id="diff.loading" message="Loading diff..." />
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
