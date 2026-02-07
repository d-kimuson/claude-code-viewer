import { Trans, useLingui } from "@lingui/react";
import {
  ChevronDown,
  ChevronUp,
  FileText,
  GitBranch,
  GitCompareIcon,
  Loader2,
  RefreshCcwIcon,
} from "lucide-react";
import type { FC } from "react";
import { useCallback, useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { DiffViewer } from "../../projects/[projectId]/sessions/[sessionId]/components/diffModal/DiffViewer";
import type { GitRef } from "../../projects/[projectId]/sessions/[sessionId]/components/diffModal/types";
import {
  useCommitAndPush,
  useCommitFiles,
  useGitCurrentRevisions,
  useGitDiff,
  usePushCommits,
} from "../../projects/[projectId]/sessions/[sessionId]/hooks/useGit";
import { CollapsibleTodoSection } from "./common/CollapsibleTodoSection";
import { ReviewTodoSection } from "./ReviewTodoSection";

interface ReviewTabContentProps {
  projectId: string;
  sessionId?: string;
}

interface DiffSummary {
  filesChanged: number;
  insertions: number;
  deletions: number;
}

const DiffSummaryComponent: FC<{
  summary: DiffSummary;
  className?: string;
}> = ({ summary, className }) => {
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
            {summary.filesChanged} <Trans id="diff.files.changed" />
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
        className="text-xs font-medium text-gray-700 dark:text-gray-300"
      >
        {label}
      </label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="w-full h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent id={id}>
          {refs.map((ref) => (
            <SelectItem key={ref.name} value={ref.name} className="text-xs">
              <div className="flex items-center gap-2">
                {getRefIcon(ref.type)}
                <span>{ref.displayName}</span>
                {ref.sha && (
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">
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

export const ReviewTabContent: FC<ReviewTabContentProps> = ({
  projectId,
  sessionId,
}) => {
  const { i18n } = useLingui();
  const commitMessageId = useId();
  const [compareFrom, setCompareFrom] = useState("HEAD");
  const [compareTo, setCompareTo] = useState("working");

  // File selection state
  const [selectedFiles, setSelectedFiles] = useState<Map<string, boolean>>(
    new Map(),
  );

  // Commit message state
  const [commitMessage, setCommitMessage] = useState("");

  // Commit section collapse state
  const [isCommitSectionExpanded, setIsCommitSectionExpanded] = useState(false);

  // API hooks
  const { data: revisionsData, isLoading: isLoadingRevisions } =
    useGitCurrentRevisions(projectId);
  const {
    mutate: getDiff,
    data: diffData,
    isPending: isDiffLoading,
    error: diffError,
  } = useGitDiff();
  const commitMutation = useCommitFiles(projectId);
  const pushMutation = usePushCommits(projectId);
  const commitAndPushMutation = useCommitAndPush(projectId);

  // Transform revisions data to GitRef format
  const gitRefs: GitRef[] =
    revisionsData?.success && revisionsData.data
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
          ...(revisionsData.data.baseBranch
            ? [
                {
                  name: `branch:${revisionsData.data.baseBranch.name}` as const,
                  type: "branch" as const,
                  displayName: `${revisionsData.data.baseBranch.name} (base)`,
                  sha: revisionsData.data.baseBranch.commit,
                },
              ]
            : []),
          ...(revisionsData.data.currentBranch
            ? [
                {
                  name: `branch:${revisionsData.data.currentBranch.name}` as const,
                  type: "branch" as const,
                  displayName: `${revisionsData.data.currentBranch.name} (current)`,
                  sha: revisionsData.data.currentBranch.commit,
                },
              ]
            : []),
          ...revisionsData.data.commits.map((commit) => ({
            name: `commit:${commit.sha}` as const,
            type: "commit" as const,
            displayName: `${commit.message.substring(0, 50)}${commit.message.length > 50 ? "..." : ""}`,
            sha: commit.sha,
          })),
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

  // Initialize file selection when diff data changes
  useEffect(() => {
    if (diffData?.success && diffData.data.files.length > 0) {
      const initialSelection = new Map(
        diffData.data.files.map((file) => [file.filePath, true]),
      );
      setSelectedFiles(initialSelection);
    }
  }, [diffData]);

  useEffect(() => {
    if (compareFrom && compareTo) {
      loadDiff();
    }
  }, [compareFrom, compareTo, loadDiff]);

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

    try {
      const result = await commitMutation.mutateAsync({
        files: selected,
        message: commitMessage,
      });

      if (result.success) {
        toast.success(
          `Committed ${result.filesCommitted} files (${result.commitSha.slice(0, 7)})`,
        );
        setCommitMessage("");
        loadDiff();
      } else {
        toast.error(result.error, { description: result.details });
      }
    } catch {
      toast.error(i18n._("Failed to commit"));
    }
  };

  // Push handler
  const handlePush = async () => {
    try {
      const result = await pushMutation.mutateAsync();

      if (result.success) {
        toast.success(`Pushed to ${result.remote}/${result.branch}`);
      } else {
        toast.error(result.error, { description: result.details });
      }
    } catch {
      toast.error(i18n._("Failed to push"));
    }
  };

  // Commit and Push handler
  const handleCommitAndPush = async () => {
    const selected = Array.from(selectedFiles.entries())
      .filter(([_, isSelected]) => isSelected)
      .map(([path]) => path);

    try {
      const result = await commitAndPushMutation.mutateAsync({
        files: selected,
        message: commitMessage,
      });

      if (result.success) {
        toast.success(`Committed and pushed (${result.commitSha.slice(0, 7)})`);
        setCommitMessage("");
        loadDiff();
      } else if (
        result.success === false &&
        "commitSucceeded" in result &&
        result.commitSucceeded
      ) {
        toast.warning(
          `Committed (${result.commitSha?.slice(0, 7)}), but push failed: ${result.error}`,
          {
            action: {
              label: i18n._("Retry Push"),
              onClick: handlePush,
            },
          },
        );
        setCommitMessage("");
        loadDiff();
      } else {
        toast.error(result.error, { description: result.details });
      }
    } catch {
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

  if (isLoadingRevisions) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
        {sessionId ? (
          <ReviewTodoSection projectId={projectId} sessionId={sessionId} />
        ) : (
          <CollapsibleTodoSection todos={null} />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with selectors */}
      <div className="p-3 border-b border-border/40 space-y-2">
        <div className="flex gap-2">
          <div className="flex-1">
            <RefSelector
              label={i18n._("Compare from")}
              value={compareFrom}
              onValueChange={setCompareFrom}
              refs={gitRefs.filter((ref) => ref.name !== "working")}
            />
          </div>
          <div className="flex-1">
            <RefSelector
              label={i18n._("Compare to")}
              value={compareTo}
              onValueChange={setCompareTo}
              refs={gitRefs}
            />
          </div>
        </div>
        <Button
          onClick={loadDiff}
          disabled={isDiffLoading || compareFrom === compareTo}
          size="sm"
          className="w-full h-7 text-xs"
        >
          {isDiffLoading ? (
            <>
              <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
              <Trans id="common.loading" />
            </>
          ) : (
            <>
              <RefreshCcwIcon className="w-3 h-3 mr-1.5" />
              Refresh
            </>
          )}
        </Button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {diffError && (
          <div className="m-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p className="text-red-600 dark:text-red-400 text-xs">
              {diffError.message}
            </p>
          </div>
        )}

        {!diffData?.success && !isDiffLoading && !diffError && (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-xl bg-muted/30 flex items-center justify-center">
                <GitCompareIcon className="w-6 h-6 text-muted-foreground/50" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  <Trans id="panel.review.empty" />
                </p>
              </div>
            </div>
          </div>
        )}

        {diffData?.success && (
          <div className="p-3 space-y-3">
            <DiffSummaryComponent
              summary={{
                filesChanged: diffData.data.files.length,
                insertions: diffData.data.summary.totalAdditions,
                deletions: diffData.data.summary.totalDeletions,
              }}
            />

            {/* Commit UI Section */}
            {compareTo === "working" && (
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() =>
                    setIsCommitSectionExpanded(!isCommitSectionExpanded)
                  }
                  className="w-full flex items-center justify-between p-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors rounded-t-lg"
                >
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    <Trans id="diff.commit.changes" />
                  </span>
                  {isCommitSectionExpanded ? (
                    <ChevronUp className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  )}
                </button>

                {isCommitSectionExpanded && (
                  <div className="p-3 pt-0 space-y-3">
                    {/* File selection controls */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleSelectAll}
                        disabled={commitMutation.isPending}
                        className="h-6 text-[10px]"
                      >
                        <Trans id="diff.select.all" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleDeselectAll}
                        disabled={commitMutation.isPending}
                        className="h-6 text-[10px]"
                      >
                        <Trans id="diff.deselect.all" />
                      </Button>
                      <span className="text-[10px] text-gray-600 dark:text-gray-400">
                        {selectedCount} / {diffData.data.files.length} files
                      </span>
                    </div>

                    {/* File list with checkboxes */}
                    <div className="space-y-1 max-h-32 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded p-2">
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
                            className="h-3 w-3"
                          />
                          <label
                            htmlFor={`file-${file.filePath}`}
                            className="text-[10px] font-mono cursor-pointer flex-1 truncate"
                          >
                            {file.filePath}
                          </label>
                        </div>
                      ))}
                    </div>

                    {/* Commit message input */}
                    <div className="space-y-1">
                      <label
                        htmlFor={commitMessageId}
                        className="text-[10px] font-medium text-gray-700 dark:text-gray-300"
                      >
                        <Trans id="diff.commit.message" />
                      </label>
                      <Textarea
                        id={commitMessageId}
                        placeholder="Enter commit message..."
                        value={commitMessage}
                        onChange={(e) => setCommitMessage(e.target.value)}
                        disabled={commitMutation.isPending}
                        className="resize-none text-xs min-h-[60px]"
                        rows={2}
                      />
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Button
                        onClick={handleCommit}
                        disabled={isCommitDisabled}
                        size="sm"
                        className="h-7 text-xs"
                      >
                        {commitMutation.isPending ? (
                          <>
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            <Trans id="diff.committing" />
                          </>
                        ) : (
                          <Trans id="diff.commit" />
                        )}
                      </Button>
                      <Button
                        onClick={handlePush}
                        disabled={pushMutation.isPending}
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                      >
                        {pushMutation.isPending ? (
                          <>
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            <Trans id="diff.pushing" />
                          </>
                        ) : (
                          <Trans id="diff.push" />
                        )}
                      </Button>
                      <Button
                        onClick={handleCommitAndPush}
                        disabled={
                          isCommitDisabled || commitAndPushMutation.isPending
                        }
                        variant="secondary"
                        size="sm"
                        className="h-7 text-xs"
                      >
                        {commitAndPushMutation.isPending ? (
                          <>
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            <Trans id="diff.committing.pushing" />
                          </>
                        ) : (
                          <Trans id="diff.commit.push" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Diff viewer */}
            <div className="space-y-2">
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
          <div className="flex items-center justify-center py-8">
            <div className="text-center space-y-2">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                <Trans id="diff.loading" />
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Todo Checklist Section - Fixed at bottom */}
      {sessionId ? (
        <ReviewTodoSection projectId={projectId} sessionId={sessionId} />
      ) : (
        <CollapsibleTodoSection todos={null} />
      )}
    </div>
  );
};
