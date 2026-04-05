import { Trans, useLingui } from "@lingui/react";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  CopyIcon,
  MessageSquarePlusIcon,
  SendHorizonalIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { type FC, memo, useMemo, useState } from "react";
import { toast } from "sonner";
import { useReviewComments, type ReviewComment } from "@/lib/atoms/reviewComments";
import { Button } from "@/web/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/web/components/ui/popover";
import { Textarea } from "@/web/components/ui/textarea";
import { useIsMobile } from "@/web/hooks/useIsMobile";
import { cn } from "@/web/utils";
import { codeMonoClass } from "../conversationList/toolVisualizers/constants";
import type { DiffHunk, DiffLine, FileDiff } from "./types";

type ReviewProps = {
  filename: string;
  reviewSessionId: string;
};

type DiffViewerProps = {
  fileDiff: FileDiff;
  className?: string;
  filename?: string;
  reviewSessionId?: string;
};

type DiffHunkProps = {
  hunk: DiffHunk;
};

type DiffContentRowsProps = {
  hunks: FileDiff["hunks"];
  reviewProps?: ReviewProps;
  commentsByLine?: ReadonlyMap<number, readonly ReviewComment[]>;
  onRemoveComment?: (id: string) => void;
};

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

const getLineNumber = (line: DiffLine): number => line.newLineNumber ?? line.oldLineNumber ?? 0;

type CommentFormProps = {
  reviewProps: ReviewProps;
  line: DiffLine;
  onClose: () => void;
};

const CommentForm: FC<CommentFormProps> = ({ reviewProps, line, onClose }) => {
  const [content, setContent] = useState("");
  const { addComment } = useReviewComments(reviewProps.reviewSessionId);
  const { i18n } = useLingui();

  const handleSave = () => {
    if (content.trim() === "") return;
    addComment({
      filename: reviewProps.filename,
      lineNumber: getLineNumber(line),
      lineType: line.type,
      content: content.trim(),
    });
    setContent("");
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={i18n._("review.comment.placeholder")}
        className="min-h-[72px] border-0 bg-transparent px-2.5 text-[13px] leading-relaxed shadow-none ring-0 placeholder:text-muted-foreground/50 focus-visible:ring-0"
      />
      <div className="flex items-center justify-between border-t border-border/40 pt-2">
        <span className="text-[10px] text-muted-foreground/50">⌘ + Enter</span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
          >
            <XIcon className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={content.trim() === ""}
            className="h-7 gap-1 rounded-full px-3 text-[11px] font-medium"
          >
            <SendHorizonalIcon className="h-3 w-3" />
            <Trans id="review.comment.save" />
          </Button>
        </div>
      </div>
    </div>
  );
};

type CommentButtonProps = {
  reviewProps: ReviewProps;
  line: DiffLine;
  lineComments: readonly ReviewComment[];
  onRemoveComment: (id: string) => void;
};

const ExistingComment: FC<{
  comment: ReviewComment;
  onRemove: (id: string) => void;
}> = ({ comment, onRemove }) => {
  return (
    <div className="group/comment relative rounded-md border border-border/50 bg-muted/30 px-2.5 py-2 transition-colors hover:border-border">
      <p className="pr-5 text-[13px] leading-relaxed text-foreground/90">{comment.content}</p>
      <button
        type="button"
        onClick={() => onRemove(comment.id)}
        className="absolute right-1.5 top-1.5 rounded p-0.5 text-muted-foreground/40 opacity-100 md:opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive md:group-hover/comment:opacity-100 group-focus-within/comment:opacity-100"
      >
        <Trash2Icon className="h-3 w-3" />
      </button>
    </div>
  );
};

const CommentButton: FC<CommentButtonProps> = ({
  reviewProps,
  line,
  lineComments,
  onRemoveComment,
}) => {
  const [open, setOpen] = useState(false);
  const hasComments = lineComments.length > 0;
  const isMobile = useIsMobile();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "absolute left-0.5 top-px z-10 flex items-center rounded-sm transition-all",
            hasComments
              ? "opacity-100"
              : "opacity-100 md:opacity-0 md:group-hover:opacity-100 group-focus-within:opacity-100",
          )}
        >
          {hasComments ? (
            <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-sky-500 px-1 text-[10px] font-semibold tabular-nums text-white shadow-sm shadow-sky-500/25">
              {lineComments.length}
            </span>
          ) : (
            <span className="flex h-[18px] w-[18px] items-center justify-center rounded-sm text-muted-foreground/60 transition-colors hover:bg-primary/10 hover:text-primary">
              <MessageSquarePlusIcon className="h-3.5 w-3.5" />
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        side={isMobile ? "bottom" : "right"}
        align={isMobile ? "center" : "start"}
        collisionPadding={8}
        className={cn(
          "overflow-hidden rounded-xl border-border/50 p-0 shadow-xl shadow-black/5 dark:shadow-black/20",
          isMobile ? "w-[calc(100vw-2rem)]" : "w-80",
        )}
      >
        {hasComments && (
          <div className="space-y-1.5 border-b border-border/40 bg-muted/20 p-3">
            {lineComments.map((comment) => (
              <ExistingComment key={comment.id} comment={comment} onRemove={onRemoveComment} />
            ))}
          </div>
        )}
        <div className="p-3">
          <CommentForm reviewProps={reviewProps} line={line} onClose={() => setOpen(false)} />
        </div>
      </PopoverContent>
    </Popover>
  );
};

const DiffHunkComponent: FC<DiffHunkProps> = ({ hunk }) => {
  return (
    <div className="w-20 shrink-0">
      <div>
        {hunk.lines.map((line) => (
          <div
            key={`gutter-${line.oldLineNumber ?? ""}-${line.newLineNumber ?? ""}`}
            className={cn(
              "grid grid-cols-[2.5rem_2.5rem] border-r border-l-4",
              codeMonoClass,
              getStickyCellClasses(line.type),
              {
                "border-green-200 border-l-green-400 dark:border-green-800/50":
                  line.type === "added",
                "border-red-200 border-l-red-400 dark:border-red-800/50": line.type === "deleted",
                "border-blue-200 border-l-blue-400 dark:border-blue-800/50": line.type === "hunk",
                "border-gray-200 border-l-transparent dark:border-gray-700":
                  line.type === "unchanged" || line.type === "context",
              },
            )}
          >
            <div className="border-r px-1 py-0.5 text-right text-xs leading-tight tabular-nums border-gray-200 dark:border-gray-700">
              {line.type !== "added" && line.type !== "hunk" && line.oldLineNumber !== undefined
                ? line.oldLineNumber
                : "\u00A0"}
            </div>
            <div className="px-1 py-0.5 text-right text-xs leading-tight tabular-nums">
              {line.type !== "deleted" && line.type !== "hunk" && line.newLineNumber !== undefined
                ? line.newLineNumber
                : "\u00A0"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const DiffContentRows: FC<DiffContentRowsProps> = ({
  hunks,
  reviewProps,
  commentsByLine,
  onRemoveComment,
}) => {
  return (
    <>
      {hunks.map((hunk) => (
        <div key={`${hunk.oldStart}-${hunk.newStart}`}>
          {hunk.lines.map((line) => {
            const lineNum = getLineNumber(line);
            const lineComments = commentsByLine?.get(lineNum) ?? [];

            return (
              <div
                data-slot="diff-row"
                key={`content-${hunk.oldStart}-${hunk.newStart}-${line.oldLineNumber ?? ""}-${line.newLineNumber ?? ""}`}
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
                  reviewProps !== undefined && line.type !== "hunk" && "group",
                )}
              >
                <div
                  data-slot="diff-row-content"
                  className={cn(
                    "relative min-w-0 px-2 py-0.5 pl-7 text-xs leading-tight whitespace-pre",
                    codeMonoClass,
                  )}
                >
                  {reviewProps !== undefined &&
                    line.type !== "hunk" &&
                    onRemoveComment !== undefined && (
                      <CommentButton
                        reviewProps={reviewProps}
                        line={line}
                        lineComments={lineComments}
                        onRemoveComment={onRemoveComment}
                      />
                    )}
                  <span
                    data-slot="diff-sign"
                    className={cn("absolute left-2 top-0.5 w-4 text-center", {
                      "text-green-600 dark:text-green-400": line.type === "added",
                      "text-red-600 dark:text-red-400": line.type === "deleted",
                      "font-medium text-blue-600 dark:text-blue-400": line.type === "hunk",
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
                  <span className="inline-block w-max min-w-full pr-4">{line.content || " "}</span>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </>
  );
};

type DiffBodyProps = {
  hunks: FileDiff["hunks"];
  reviewProps?: ReviewProps;
  commentsByLine?: ReadonlyMap<number, readonly ReviewComment[]>;
  onRemoveComment?: (id: string) => void;
};

const DiffBody: FC<DiffBodyProps> = ({ hunks, reviewProps, commentsByLine, onRemoveComment }) => {
  return (
    <div className="relative flex">
      <div className="w-20 shrink-0">
        {hunks.map((hunk) => (
          <DiffHunkComponent key={`${hunk.oldStart}-${hunk.newStart}`} hunk={hunk} />
        ))}
      </div>
      <div className="min-w-0 flex-1 overflow-x-auto">
        <div className="inline-block w-max min-w-full align-top">
          <DiffContentRows
            hunks={hunks}
            reviewProps={reviewProps}
            commentsByLine={commentsByLine}
            onRemoveComment={onRemoveComment}
          />
        </div>
      </div>
    </div>
  );
};

type FileHeaderProps = {
  fileDiff: FileDiff;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
};

const FileHeader: FC<FileHeaderProps> = ({ fileDiff, isCollapsed, onToggleCollapse }) => {
  const getFileStatusIcon = () => {
    if (fileDiff.isNew) return <span className="text-green-600 dark:text-green-400">A</span>;
    if (fileDiff.isDeleted) return <span className="text-red-600 dark:text-red-400">D</span>;
    if (fileDiff.isRenamed) return <span className="text-blue-600 dark:text-blue-400">R</span>;
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
    <div className="w-full bg-gray-50 dark:bg-gray-800 px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors sticky top-0 z-20">
      <button
        type="button"
        onClick={onToggleCollapse}
        className="w-full text-left"
        aria-expanded={!isCollapsed}
      >
        <div className="w-full flex items-center gap-2 pr-8">
          {isCollapsed ? (
            <ChevronRightIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
          ) : (
            <ChevronDownIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
          )}
          <div
            className={cn(
              "w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs flex-shrink-0",
              codeMonoClass,
            )}
          >
            {getFileStatusIcon()}
          </div>
          <span
            className={cn(
              "text-xs font-medium text-black dark:text-white text-left truncate flex-1 min-w-0",
              codeMonoClass,
            )}
          >
            {fileDiff.filename}
          </span>
          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
            {fileDiff.linesAdded > 0 && (
              <span className="text-green-600 dark:text-green-400">+{fileDiff.linesAdded}</span>
            )}
            {fileDiff.linesDeleted > 0 && (
              <span className="text-red-600 dark:text-red-400">-{fileDiff.linesDeleted}</span>
            )}
          </div>
        </div>
      </button>
      <Button
        type="button"
        onClick={(event) => {
          void handleCopyFilename(event);
        }}
        variant="ghost"
        size="sm"
        className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 p-1 hover:bg-gray-200 dark:hover:bg-gray-600"
      >
        <CopyIcon className="w-3 h-3 text-gray-500 dark:text-gray-400" />
      </Button>
      {fileDiff.isBinary && (
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-left">
          Binary file (content not shown)
        </div>
      )}
    </div>
  );
};

const useCommentsByLine = (reviewSessionId: string | undefined, filename: string | undefined) => {
  const sessionId = reviewSessionId ?? "";
  const { comments, addComment, removeComment, clearComments } = useReviewComments(sessionId);

  const commentsByLine = useMemo(() => {
    if (filename === undefined) return new Map<number, readonly ReviewComment[]>();
    const map = new Map<number, ReviewComment[]>();
    for (const comment of comments) {
      if (comment.filename !== filename) continue;
      const existing = map.get(comment.lineNumber);
      if (existing !== undefined) {
        existing.push(comment);
      } else {
        map.set(comment.lineNumber, [comment]);
      }
    }
    return map;
  }, [comments, filename]);

  return { commentsByLine, addComment, removeComment, clearComments };
};

export const DiffViewer: FC<DiffViewerProps> = memo(
  ({ fileDiff, className, filename, reviewSessionId }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const commentModeEnabled = filename !== undefined && reviewSessionId !== undefined;
    const { commentsByLine, removeComment } = useCommentsByLine(reviewSessionId, filename);

    const reviewProps: ReviewProps | undefined = commentModeEnabled
      ? { filename, reviewSessionId }
      : undefined;

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
            <DiffBody
              hunks={fileDiff.hunks}
              reviewProps={reviewProps}
              commentsByLine={commentsByLine}
              onRemoveComment={removeComment}
            />
          </div>
        )}
      </div>
    );
  },
);

DiffViewer.displayName = "DiffViewer";
