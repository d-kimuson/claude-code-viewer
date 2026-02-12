import { Trans } from "@lingui/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckIcon,
  Eye,
  FileCode,
  GitBranchIcon,
  GitCompareIcon,
  Loader2,
} from "lucide-react";
import { type FC, useEffect, useMemo, useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  oneDark,
  oneLight,
} from "react-syntax-highlighter/dist/esm/styles/prism";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { useTheme } from "@/hooks/useTheme";
import { fileContentQuery, gitCurrentRevisionsQuery } from "@/lib/api/queries";
import { detectLanguage } from "@/lib/file-viewer";
import { extractLatestTodos } from "@/lib/todo-viewer";
import { cn } from "@/lib/utils";
import { DiffViewer } from "../../projects/[projectId]/sessions/[sessionId]/components/diffModal/DiffViewer";
import {
  useGitBranches,
  useGitCheckout,
  useGitCurrentRevisionsSuspense,
  useGitDiff,
} from "../../projects/[projectId]/sessions/[sessionId]/hooks/useGit";
import { useSession } from "../../projects/[projectId]/sessions/[sessionId]/hooks/useSession";
import { CollapsibleTodoSection } from "./common/CollapsibleTodoSection";

interface GitTabContentProps {
  projectId: string;
  sessionId?: string;
}

interface BranchSelectorProps {
  projectId: string;
  currentBranch: string | null;
}

const BranchSelector: FC<BranchSelectorProps> = ({
  projectId,
  currentBranch,
}) => {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { data: branchesData, isLoading: isBranchesLoading } =
    useGitBranches(projectId);
  const { mutate: checkout, isPending: isCheckoutPending } =
    useGitCheckout(projectId);

  const localBranches = useMemo(() => {
    if (!branchesData?.success) return [];
    // All branches returned from API are already local branches (remote branches are filtered out)
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
          queryClient.invalidateQueries({
            queryKey: gitCurrentRevisionsQuery(projectId).queryKey,
          });
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
    <div className="border-b border-border/40 px-3 py-2 bg-muted/10">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 h-7 px-2 text-xs font-normal"
            disabled={isBranchesLoading || isCheckoutPending}
          >
            <GitBranchIcon className="w-3.5 h-3.5 text-muted-foreground" />
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
    </div>
  );
};

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

export const GitTabContent: FC<GitTabContentProps> = ({
  projectId,
  sessionId,
}) => {
  const { data: revisionsData } = useGitCurrentRevisionsSuspense(projectId);
  const {
    mutate: getDiff,
    data: diffData,
    isPending: isDiffLoading,
  } = useGitDiff();

  // Load diff on mount
  useEffect(() => {
    if (revisionsData?.success) {
      getDiff({
        projectId,
        fromRef: "HEAD",
        toRef: "working",
      });
    }
  }, [revisionsData, projectId, getDiff]);

  const gitChangesCount = diffData?.success ? diffData.data.files.length : 0;
  const hasGitChanges = gitChangesCount > 0;

  // Create a map of file path to diff data for quick lookup
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

  const currentBranchName = revisionsData?.success
    ? (revisionsData.data.currentBranch?.name ?? null)
    : null;

  if (!hasGitChanges && !isDiffLoading) {
    return (
      <div className="flex flex-col h-full">
        <BranchSelector
          projectId={projectId}
          currentBranch={currentBranchName}
        />
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
        {sessionId && (
          <SessionTodoSection projectId={projectId} sessionId={sessionId} />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Branch Selector - Fixed at top */}
      <BranchSelector projectId={projectId} currentBranch={currentBranchName} />

      {/* Scrollable Files Section */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {isDiffLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {diffData?.success &&
              diffData.data.files.map((file) => {
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
        )}
      </div>

      {/* Todo Checklist Section - Fixed at bottom */}
      {sessionId && (
        <SessionTodoSection projectId={projectId} sessionId={sessionId} />
      )}
    </div>
  );
};
