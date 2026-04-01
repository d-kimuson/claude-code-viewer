import { Trans, useLingui } from "@lingui/react";
import { useIsFetching, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckIcon,
  ChevronDown,
  ChevronUp,
  ExternalLinkIcon,
  Eye,
  FileCode,
  GitBranchIcon,
  GitCompareIcon,
  GitPullRequestIcon,
  Loader2,
  RefreshCwIcon,
} from "lucide-react";
import {
  type FC,
  Suspense,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  oneDark,
  oneLight,
} from "react-syntax-highlighter/dist/esm/styles/prism";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useTheme } from "@/hooks/useTheme";
import {
  fileContentQuery,
  gitBranchesQuery,
  gitCurrentRevisionsQuery,
} from "@/lib/api/queries";
import { detectLanguage } from "@/lib/file-viewer";
import { extractLatestTodos } from "@/lib/todo-viewer";
import { cn } from "@/lib/utils";
import { DiffViewer } from "../../projects/[projectId]/sessions/[sessionId]/components/diffModal/DiffViewer";
import {
  useCommitAndPush,
  useCommitFiles,
  useGitBranches,
  useGitCheckout,
  useGitCurrentRevisionsSuspense,
  useGitDiffSuspense,
  usePushCommits,
} from "../../projects/[projectId]/sessions/[sessionId]/hooks/useGit";
import { useSession } from "../../projects/[projectId]/sessions/[sessionId]/hooks/useSession";
import { CollapsibleTodoSection } from "./common/CollapsibleTodoSection";

// ---------------------------------------------------------------------------
// BranchSelector (Suspense component)
// ---------------------------------------------------------------------------

const BranchSelectorFallback: FC = () => (
  <Button
    variant="ghost"
    size="sm"
    className="flex-1 min-w-0 justify-start gap-2 h-7 px-2 text-xs font-normal"
    disabled
  >
    <GitBranchIcon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
    <span className="flex items-center gap-1">
      <Loader2 className="w-3 h-3 animate-spin" />
      <span className="text-muted-foreground">Loading...</span>
    </span>
  </Button>
);

const BranchSelectorContent: FC<{ projectId: string }> = ({ projectId }) => {
  const [open, setOpen] = useState(false);
  const { data: revisionsData } = useGitCurrentRevisionsSuspense(projectId);
  const { data: branchesData } = useGitBranches(projectId);
  const { mutate: checkout, isPending: isCheckoutPending } =
    useGitCheckout(projectId);

  const currentBranch = revisionsData?.success
    ? (revisionsData.data.currentBranch?.name ?? null)
    : null;

  const localBranches = useMemo(() => {
    if (!branchesData?.success) return [];
    return branchesData.data.branches;
  }, [branchesData]);

  const handleCheckout = (branchName: string) => {
    if (branchName === currentBranch) {
      setOpen(false);
      return;
    }

    checkout(branchName, {
      onSuccess: (result) => {
        if (result.success) {
          toast.success(`Switched to ${branchName}`);
        } else {
          toast.error("Failed to switch branch");
        }
        setOpen(false);
      },
      onError: () => {
        toast.error("Failed to switch branch");
        setOpen(false);
      },
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 min-w-0 justify-start gap-2 h-7 px-2 text-xs font-normal"
          disabled={isCheckoutPending}
        >
          <GitBranchIcon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <span className="font-mono truncate flex-1 text-left">
            {isCheckoutPending ? (
              <span className="flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Switching...
              </span>
            ) : (
              (currentBranch ?? "No branch")
            )}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search branch..." className="h-8" />
          <CommandList>
            <CommandEmpty>No branch found.</CommandEmpty>
            <CommandGroup>
              {localBranches.map((branch) => (
                <CommandItem
                  key={branch.name}
                  value={branch.name}
                  onSelect={() => handleCheckout(branch.name)}
                  className="text-xs"
                >
                  <GitBranchIcon className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                  <span className="font-mono truncate flex-1">
                    {branch.name}
                  </span>
                  {branch.name === currentBranch && (
                    <CheckIcon className="w-3.5 h-3.5 text-primary" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

// ---------------------------------------------------------------------------
// GitFileDialog (non-Suspense, uses lazy useQuery)
// ---------------------------------------------------------------------------

interface GitFileDialogProps {
  projectId: string;
  filePath: string;
  status: string;
  additions: number;
  deletions: number;
  diffHunks?: {
    oldStart: number;
    newStart: number;
    lines: Array<{
      type: "added" | "deleted" | "unchanged" | "hunk" | "context";
      oldLineNumber?: number;
      newLineNumber?: number;
      content: string;
    }>;
  }[];
  children: React.ReactNode;
}

const GitFileDialog: FC<GitFileDialogProps> = ({
  projectId,
  filePath,
  status,
  additions,
  deletions,
  diffHunks,
  children,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"content" | "diff">("diff");
  const { resolvedTheme } = useTheme();
  const syntaxTheme = resolvedTheme === "dark" ? oneDark : oneLight;

  const { data, isLoading, error, refetch } = useQuery({
    ...fileContentQuery(projectId, filePath),
    enabled: isOpen && activeTab === "content",
  });

  const fileName = filePath.split("/").pop() ?? filePath;
  const language =
    data?.success === true ? data.language : detectLanguage(filePath);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        className="w-[95vw] md:w-[90vw] lg:w-[90vw] max-w-[1600px] h-[85vh] max-h-[85vh] flex flex-col p-0"
        data-testid="git-file-dialog"
      >
        <DialogHeader className="px-6 py-4 border-b bg-muted/30">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-1">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileCode className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg font-semibold leading-tight mb-1 pr-8 break-all">
                {fileName}
              </DialogTitle>
              <DialogDescription
                className="text-xs flex items-center gap-2 flex-wrap"
                asChild
              >
                <div>
                  <code className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono break-all">
                    {filePath}
                  </code>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-[10px]",
                      status === "added" && "bg-green-500/20 text-green-700",
                      status === "deleted" && "bg-red-500/20 text-red-700",
                      status === "modified" && "bg-amber-500/20 text-amber-700",
                      status === "renamed" && "bg-blue-500/20 text-blue-700",
                    )}
                  >
                    {status}
                  </Badge>
                  {additions > 0 && (
                    <span className="text-green-600 dark:text-green-400 text-[10px]">
                      +{additions}
                    </span>
                  )}
                  {deletions > 0 && (
                    <span className="text-red-600 dark:text-red-400 text-[10px]">
                      -{deletions}
                    </span>
                  )}
                </div>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "content" | "diff")}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <TabsList className="mx-4 mt-2 w-fit">
            <TabsTrigger value="diff" className="text-xs">
              <GitCompareIcon className="w-3.5 h-3.5 mr-1" />
              <Trans id="panel.git.view_diff" />
            </TabsTrigger>
            <TabsTrigger value="content" className="text-xs">
              <Eye className="w-3.5 h-3.5 mr-1" />
              <Trans id="panel.git.view_content" />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="diff" className="flex-1 overflow-auto m-0 p-4">
            {diffHunks && diffHunks.length > 0 ? (
              <DiffViewer
                fileDiff={{
                  filename: filePath,
                  isNew: status === "added",
                  isDeleted: status === "deleted",
                  isRenamed: status === "renamed",
                  isBinary: false,
                  hunks: diffHunks,
                  linesAdded: additions,
                  linesDeleted: deletions,
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                No diff available
              </div>
            )}
          </TabsContent>

          <TabsContent value="content" className="flex-1 overflow-auto m-0">
            {isLoading && (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  <Trans id="assistant.tool.loading_file" />
                </p>
              </div>
            )}
            {error && (
              <div className="flex flex-col items-center justify-center h-full gap-4 px-6">
                <AlertCircle className="h-8 w-8 text-destructive" />
                <p className="text-sm text-destructive text-center">
                  <Trans id="assistant.tool.error_loading_file" />
                </p>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  <Trans id="assistant.tool.retry" />
                </Button>
              </div>
            )}
            {data && !data.success && (
              <div className="flex flex-col items-center justify-center h-full gap-4 px-6">
                <AlertCircle className="h-8 w-8 text-destructive" />
                <p className="text-sm text-destructive text-center">
                  {data.error === "NOT_FOUND" && (
                    <Trans id="assistant.tool.file_not_found" />
                  )}
                  {data.error === "BINARY_FILE" && (
                    <Trans id="assistant.tool.binary_file" />
                  )}
                  {data.error === "INVALID_PATH" && (
                    <Trans id="assistant.tool.invalid_path" />
                  )}
                  {data.error === "READ_ERROR" && (
                    <Trans id="assistant.tool.read_error" />
                  )}
                </p>
              </div>
            )}
            {data?.success === true && (
              <SyntaxHighlighter
                style={syntaxTheme}
                language={language}
                showLineNumbers
                wrapLines
                customStyle={{
                  margin: 0,
                  borderRadius: 0,
                  fontSize: "0.75rem",
                  minHeight: "100%",
                }}
                lineNumberStyle={{
                  minWidth: "3em",
                  paddingRight: "1em",
                  textAlign: "right",
                  userSelect: "none",
                }}
              >
                {data.content}
              </SyntaxHighlighter>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

// ---------------------------------------------------------------------------
// GitFileList (Suspense component)
// ---------------------------------------------------------------------------

const GitFileListFallback: FC = () => (
  <div className="flex items-center justify-center py-8">
    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
  </div>
);

const GitFileListWithCommit: FC<{ projectId: string }> = ({ projectId }) => {
  const { i18n } = useLingui();
  const commitMessageId = useId();
  const { data: diffData } = useGitDiffSuspense(projectId, "HEAD", "working");
  const queryClient = useQueryClient();

  const files = diffData?.success ? diffData.data.files : [];
  const hasGitChanges = files.length > 0;

  const [selectedFiles, setSelectedFiles] = useState<Map<string, boolean>>(
    () => new Map(),
  );
  const [commitMessage, setCommitMessage] = useState("");
  const [isCommitSectionExpanded, setIsCommitSectionExpanded] = useState(false);

  const commitMutation = useCommitFiles(projectId);
  const pushMutation = usePushCommits(projectId);
  const commitAndPushMutation = useCommitAndPush(projectId);

  const diffsByFile = useMemo(() => {
    if (!diffData?.success) return new Map();
    const map = new Map<
      string,
      {
        hunks: {
          oldStart: number;
          newStart: number;
          lines: Array<{
            type: "added" | "deleted" | "unchanged" | "hunk" | "context";
            oldLineNumber?: number;
            newLineNumber?: number;
            content: string;
          }>;
        }[];
      }
    >();
    for (const diff of diffData.data.diffs) {
      map.set(diff.file.filePath, { hunks: diff.hunks });
    }
    return map;
  }, [diffData]);

  useEffect(() => {
    if (diffData?.success && diffData.data.files.length > 0) {
      setSelectedFiles(
        new Map(diffData.data.files.map((file) => [file.filePath, true])),
      );
    }
  }, [diffData]);

  const handleToggleFile = (filePath: string) => {
    setSelectedFiles((prev) => {
      const next = new Map(prev);
      next.set(filePath, !prev.get(filePath));
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

  const invalidateDiffQueries = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: ["git", "diff", projectId],
    });
  }, [queryClient, projectId]);

  const handleCommit = async () => {
    const selected = Array.from(selectedFiles.entries())
      .filter(([, isSelected]) => isSelected)
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
        invalidateDiffQueries();
      } else {
        toast.error(result.error, { description: result.details });
      }
    } catch {
      toast.error(i18n._("Failed to commit"));
    }
  };

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

  const handleCommitAndPush = async () => {
    const selected = Array.from(selectedFiles.entries())
      .filter(([, isSelected]) => isSelected)
      .map(([path]) => path);

    try {
      const result = await commitAndPushMutation.mutateAsync({
        files: selected,
        message: commitMessage,
      });

      if (result.success) {
        toast.success(`Committed and pushed (${result.commitSha.slice(0, 7)})`);
        setCommitMessage("");
        invalidateDiffQueries();
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
        invalidateDiffQueries();
      } else {
        toast.error(result.error, { description: result.details });
      }
    } catch {
      toast.error(i18n._("Failed to commit and push"));
    }
  };

  const selectedCount = Array.from(selectedFiles.values()).filter(
    Boolean,
  ).length;
  const isCommitDisabled =
    selectedCount === 0 ||
    commitMessage.trim().length === 0 ||
    commitMutation.isPending;

  if (!hasGitChanges) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-xl bg-muted/30 flex items-center justify-center">
            <GitCompareIcon className="w-6 h-6 text-muted-foreground/50" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">
              <Trans id="panel.git.empty" />
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* File list with checkboxes */}
      <div className="p-2 space-y-1">
        {files.map((file) => {
          const diffInfo = diffsByFile.get(file.filePath);
          return (
            <GitFileDialog
              key={file.filePath}
              projectId={projectId}
              filePath={file.filePath}
              status={file.status}
              additions={file.additions}
              deletions={file.deletions}
              diffHunks={diffInfo?.hunks}
            >
              <button
                type="button"
                className="w-full flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-muted/30 rounded-md transition-colors text-left"
                data-testid="git-file-button"
              >
                <Checkbox
                  checked={selectedFiles.get(file.filePath) ?? false}
                  onCheckedChange={() => handleToggleFile(file.filePath)}
                  onClick={(e) => e.stopPropagation()}
                  disabled={commitMutation.isPending}
                  className="h-3 w-3"
                />
                <span
                  className={cn(
                    "w-1.5 h-1.5 rounded-full flex-shrink-0",
                    file.status === "added" && "bg-green-500",
                    file.status === "deleted" && "bg-red-500",
                    file.status === "modified" && "bg-amber-500",
                    file.status === "renamed" && "bg-blue-500",
                  )}
                />
                <span className="truncate flex-1 font-mono">
                  {file.filePath}
                </span>
                <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  {file.additions > 0 && (
                    <span className="text-green-600 dark:text-green-400">
                      +{file.additions}
                    </span>
                  )}
                  {file.deletions > 0 && (
                    <span className="text-red-600 dark:text-red-400">
                      -{file.deletions}
                    </span>
                  )}
                </span>
              </button>
            </GitFileDialog>
          );
        })}
      </div>

      {/* Commit section */}
      <div className="mx-2 mb-2 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={() => setIsCommitSectionExpanded(!isCommitSectionExpanded)}
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
                {selectedCount} / {files.length} files
              </span>
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
                disabled={isCommitDisabled || commitAndPushMutation.isPending}
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
    </div>
  );
};

// ---------------------------------------------------------------------------
// SessionTodoSection (Suspense component)
// ---------------------------------------------------------------------------

const SessionTodoSection: FC<{ projectId: string; sessionId: string }> = ({
  projectId,
  sessionId,
}) => {
  const { conversations } = useSession(projectId, sessionId);
  const latestTodos = useMemo(
    () => extractLatestTodos(conversations),
    [conversations],
  );
  return <CollapsibleTodoSection todos={latestTodos} />;
};

// ---------------------------------------------------------------------------
// SessionPrLinksSection (Suspense component)
// ---------------------------------------------------------------------------

const SessionPrLinksSection: FC<{ projectId: string; sessionId: string }> = ({
  projectId,
  sessionId,
}) => {
  const { session } = useSession(projectId, sessionId);
  const prLinks = session.meta.prLinks;

  if (prLinks.length === 0) return null;

  return (
    <div className="border-t border-border/40">
      <div className="px-3 py-2 bg-muted/10">
        <div className="flex items-center gap-1.5 mb-2">
          <GitPullRequestIcon className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">
            <Trans id="panel.git.pr_links" />
          </span>
        </div>
        <div className="space-y-1.5">
          {prLinks.map((link) => (
            <a
              key={`${link.prRepository}#${link.prNumber}`}
              href={link.prUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors group text-xs"
            >
              <GitPullRequestIcon className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
              <span className="flex-1 min-w-0 truncate text-foreground">
                {link.prRepository}#{link.prNumber}
              </span>
              <ExternalLinkIcon className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// GitTabContent (exported, manages Suspense boundaries + reload)
// ---------------------------------------------------------------------------

interface GitTabContentProps {
  projectId: string;
  sessionId?: string;
}

export const GitTabContent: FC<GitTabContentProps> = ({
  projectId,
  sessionId,
}) => {
  const queryClient = useQueryClient();
  const isGitFetching =
    useIsFetching({
      predicate: (query) =>
        query.queryKey[0] === "git" && query.queryKey.includes(projectId),
    }) > 0;

  const handleReload = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: gitCurrentRevisionsQuery(projectId).queryKey,
    });
    queryClient.invalidateQueries({
      queryKey: gitBranchesQuery(projectId).queryKey,
    });
    queryClient.invalidateQueries({
      queryKey: ["git", "diff", projectId],
    });
  }, [queryClient, projectId]);

  return (
    <div className="flex flex-col h-full">
      {/* Header: Branch selector + Reload button */}
      <div className="border-b border-border/40 px-3 py-2 bg-muted/10 flex items-center gap-1">
        <Suspense fallback={<BranchSelectorFallback />}>
          <BranchSelectorContent projectId={projectId} />
        </Suspense>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 flex-shrink-0"
          onClick={handleReload}
          disabled={isGitFetching}
        >
          <RefreshCwIcon
            className={cn(
              "w-3.5 h-3.5 text-muted-foreground",
              isGitFetching && "animate-spin",
            )}
          />
        </Button>
      </div>

      {/* File list */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <Suspense fallback={<GitFileListFallback />}>
          <GitFileListWithCommit projectId={projectId} />
        </Suspense>
      </div>

      {/* PR links section */}
      {sessionId && (
        <Suspense fallback={null}>
          <SessionPrLinksSection projectId={projectId} sessionId={sessionId} />
        </Suspense>
      )}

      {/* Todo section */}
      {sessionId && (
        <Suspense fallback={null}>
          <SessionTodoSection projectId={projectId} sessionId={sessionId} />
        </Suspense>
      )}
    </div>
  );
};
