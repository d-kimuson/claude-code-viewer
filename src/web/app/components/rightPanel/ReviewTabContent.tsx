import { Trans, useLingui } from "@lingui/react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  ClipboardPasteIcon,
  FileText,
  GitBranch,
  GitCompareIcon,
  Loader2,
  RefreshCcwIcon,
  Trash2Icon,
} from "lucide-react";
import { type FC, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useChatInputDraft } from "@/lib/atoms/chatInputDrafts";
import { formatReviewMarkdown, useReviewComments } from "@/lib/atoms/reviewComments";
import { Button } from "@/web/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/web/components/ui/select";
import { cn } from "@/web/utils";
import { DiffViewer } from "../../projects/[projectId]/sessions/[sessionId]/components/diffModal/DiffViewer";
import type { GitRef } from "../../projects/[projectId]/sessions/[sessionId]/components/diffModal/types";
import {
  useGitCurrentRevisions,
  useGitDiff,
} from "../../projects/[projectId]/sessions/[sessionId]/hooks/useGit";
import { CollapsibleTodoSection } from "./common/CollapsibleTodoSection";
import { ReviewTodoSection } from "./ReviewTodoSection";

type ReviewTabContentProps = {
  projectId: string;
  sessionId?: string;
};

type DiffSummary = {
  filesChanged: number;
  insertions: number;
  deletions: number;
};

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
            <span className="text-red-600 dark:text-red-400 font-medium">-{summary.deletions}</span>
          )}
        </div>
      </div>
    </div>
  );
};

type RefSelectorProps = {
  label: string;
  value: string;
  onValueChange: (value: GitRef["name"]) => void;
  refs: GitRef[];
};

const RefSelector: FC<RefSelectorProps> = ({ label, value, onValueChange, refs }) => {
  const id = useId();
  const getRefIcon = (type: GitRef["type"]) => {
    switch (type) {
      case "branch":
        return <GitBranch className="h-4 w-4" />;
      case "commit":
        return <span className="text-xs">📝</span>;
      case "head":
        return <GitBranch className="h-4 w-4" />;
      case "working":
        return <span className="text-xs">🚧</span>;
      default:
        return <GitBranch className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-xs font-medium text-gray-700 dark:text-gray-300">
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
                {ref.sha !== undefined && ref.sha !== "" && (
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

export const ReviewTabContent: FC<ReviewTabContentProps> = ({ projectId, sessionId }) => {
  const { i18n } = useLingui();
  const [compareFrom, setCompareFrom] = useState("HEAD");
  const [compareTo, setCompareTo] = useState("working");
  const diffScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const diffListAnchorRef = useRef<HTMLDivElement | null>(null);
  const [diffListScrollMargin, setDiffListScrollMargin] = useState(0);

  // Review comments
  const { comments, clearComments } = useReviewComments(sessionId ?? "");
  const [, setDraft] = useChatInputDraft({
    projectId,
    sessionId: sessionId ?? "",
  });

  // API hooks
  const { data: revisionsData, isLoading: isLoadingRevisions } = useGitCurrentRevisions(projectId);
  const {
    mutate: getDiff,
    data: diffData,
    isPending: isDiffLoading,
    error: diffError,
  } = useGitDiff();
  const revisionDetails = revisionsData?.success === true ? revisionsData.data : undefined;
  const diffResult = diffData?.success === true ? diffData.data : undefined;
  const diffEntries = useMemo(() => diffResult?.diffs ?? [], [diffResult]);
  const createBranchRef = (name: string, displayName: string, sha: string): GitRef => ({
    name: `branch:${name}`,
    type: "branch",
    displayName,
    sha,
  });
  const createCommitRef = (sha: string, displayName: string): GitRef => ({
    name: `commit:${sha}`,
    type: "commit",
    displayName,
    sha,
  });

  // Transform revisions data to GitRef format
  const gitRefs: GitRef[] =
    revisionDetails !== undefined
      ? [
          {
            name: "working",
            type: "working",
            displayName: i18n._("Uncommitted changes"),
          },
          {
            name: "HEAD",
            type: "head",
            displayName: "HEAD",
            ...(revisionDetails.head !== null ? { sha: revisionDetails.head } : {}),
          },
          ...(revisionDetails.baseBranch !== null
            ? [
                createBranchRef(
                  revisionDetails.baseBranch.name,
                  `${revisionDetails.baseBranch.name} (base)`,
                  revisionDetails.baseBranch.commit,
                ),
              ]
            : []),
          ...(revisionDetails.currentBranch !== null
            ? [
                createBranchRef(
                  revisionDetails.currentBranch.name,
                  `${revisionDetails.currentBranch.name} (current)`,
                  revisionDetails.currentBranch.commit,
                ),
              ]
            : []),
          ...revisionDetails.commits.map((commit) =>
            createCommitRef(
              commit.sha,
              `${commit.message.substring(0, 50)}${commit.message.length > 50 ? "..." : ""}`,
            ),
          ),
        ]
      : [];

  const loadDiff = useCallback(() => {
    if (compareFrom.length > 0 && compareTo.length > 0 && compareFrom !== compareTo) {
      getDiff({
        projectId,
        fromRef: compareFrom,
        toRef: compareTo,
      });
    }
  }, [compareFrom, compareTo, getDiff, projectId]);

  useEffect(() => {
    if (compareFrom.length > 0 && compareTo.length > 0) {
      loadDiff();
    }
  }, [compareFrom, compareTo, loadDiff]);

  // Review action handlers
  const handleReset = () => {
    clearComments();
    toast.success(i18n._("review.action.reset.success"));
  };

  const handleInsertReview = () => {
    const markdown = formatReviewMarkdown(comments, compareFrom, compareTo);
    setDraft((prev) => (prev ? `${prev}\n\n${markdown}` : markdown));
    toast.success(i18n._("review.action.insert.success"));
  };

  const diffVirtualizer = useVirtualizer({
    count: diffEntries.length,
    getScrollElement: () => diffScrollContainerRef.current,
    getItemKey: (index) => {
      const diff = diffEntries[index];
      return diff === undefined ? index : `${diff.file.filePath}-${index}`;
    },
    estimateSize: () => 420,
    overscan: 8,
    scrollMargin: diffListScrollMargin,
    useAnimationFrameWithResizeObserver: true,
  });

  useEffect(() => {
    const scrollElement = diffScrollContainerRef.current;
    const anchorElement = diffListAnchorRef.current;
    if (scrollElement === null || anchorElement === null) {
      return;
    }

    const updateScrollMargin = () => {
      const scrollRect = scrollElement.getBoundingClientRect();
      const anchorRect = anchorElement.getBoundingClientRect();
      setDiffListScrollMargin(anchorRect.top - scrollRect.top + scrollElement.scrollTop);
    };

    updateScrollMargin();

    const resizeObserver = new ResizeObserver(() => {
      updateScrollMargin();
    });
    resizeObserver.observe(scrollElement);
    resizeObserver.observe(anchorElement);
    window.addEventListener("resize", updateScrollMargin);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateScrollMargin);
    };
  }, [diffEntries.length]);

  useEffect(() => {
    diffVirtualizer.measure();
  }, [diffVirtualizer, diffEntries]);

  const virtualDiffItems = diffVirtualizer.getVirtualItems();
  const totalDiffSize = diffVirtualizer.getTotalSize();
  const firstVirtualDiff = virtualDiffItems[0];
  const lastVirtualDiff = virtualDiffItems[virtualDiffItems.length - 1];
  const diffPaddingTop = firstVirtualDiff?.start ?? 0;
  const diffPaddingBottom = totalDiffSize - (lastVirtualDiff?.end ?? 0);

  if (isLoadingRevisions) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
        {sessionId !== undefined && sessionId !== "" ? (
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
      <div ref={diffScrollContainerRef} className="flex-1 min-h-0 overflow-y-auto">
        {diffError && (
          <div className="m-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p className="text-red-600 dark:text-red-400 text-xs">{diffError.message}</p>
          </div>
        )}

        {diffResult === undefined && !isDiffLoading && diffError === null && (
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

        {diffResult !== undefined && (
          <div>
            {/* Review Actions bar - sticky */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border/40 bg-background/95 px-3 py-2 backdrop-blur-sm">
              <span className="text-xs text-muted-foreground">
                {comments.length === 0
                  ? i18n._("review.comments.empty")
                  : i18n._("review.comments.count", {
                      count: comments.length,
                    })}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={comments.length === 0}
                  onClick={handleReset}
                  className="h-7 text-xs"
                >
                  <Trash2Icon className="w-3 h-3 mr-1" />
                  <Trans id="review.action.reset" />
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  disabled={comments.length === 0}
                  onClick={handleInsertReview}
                  className="h-7 text-xs"
                >
                  <ClipboardPasteIcon className="w-3 h-3 mr-1" />
                  <Trans id="review.action.insert" />
                </Button>
              </div>
            </div>

            <div className="p-3 space-y-3">
              <DiffSummaryComponent
                summary={{
                  filesChanged: diffResult.files.length,
                  insertions: diffResult.summary.totalAdditions,
                  deletions: diffResult.summary.totalDeletions,
                }}
              />

              {/* Diff viewer */}
              <div ref={diffListAnchorRef}>
                <ul
                  className="w-full"
                  style={{
                    paddingTop: `${diffPaddingTop}px`,
                    paddingBottom: `${diffPaddingBottom}px`,
                  }}
                >
                  {virtualDiffItems.map((virtualDiff) => {
                    const diff = diffEntries[virtualDiff.index];
                    if (diff === undefined) {
                      return null;
                    }

                    return (
                      <li
                        key={`${diff.file.filePath}-${virtualDiff.index}`}
                        ref={diffVirtualizer.measureElement}
                        data-index={virtualDiff.index}
                        className="pb-2 last:pb-0"
                      >
                        <DiffViewer
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
                          filename={diff.file.filePath}
                          reviewSessionId={sessionId}
                        />
                      </li>
                    );
                  })}
                </ul>
              </div>
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
      {sessionId !== undefined && sessionId !== "" ? (
        <ReviewTodoSection projectId={projectId} sessionId={sessionId} />
      ) : (
        <CollapsibleTodoSection todos={null} />
      )}
    </div>
  );
};
