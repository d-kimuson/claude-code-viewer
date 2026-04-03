import { Trans } from "@lingui/react";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ChevronRight,
  Copy,
  Eye,
  FileText,
  FolderOpen,
  Hash,
  RefreshCw,
} from "lucide-react";
import {
  Component,
  type FC,
  type ReactNode,
  Suspense,
  useCallback,
  useMemo,
  useState,
} from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { toast } from "sonner";
import { detectLanguage } from "@/lib/file-viewer";
import { Badge } from "@/web/components/ui/badge";
import { Button } from "@/web/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/web/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/web/components/ui/select";
import { Skeleton } from "@/web/components/ui/skeleton";
import { fileContentQuery } from "@/web/lib/api/queries";
import { cn } from "@/web/utils";
import { useTheme } from "../../../../../../../hooks/useTheme";

const codeMonoClass =
  '[font-family:"Fira_Code","Fira_Mono",Menlo,Consolas,"DejaVu_Sans_Mono",monospace]';

export type FileContentDialogProps = {
  projectId: string;
  filePaths: readonly string[];
  children?: ReactNode;
};

// --- Skeleton for code content ---
const CodeSkeleton: FC = () => {
  // Generate varied-width skeleton lines that mimic code
  const lines = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => {
        // Pseudo-random widths based on index for a natural look
        const widths = [45, 72, 60, 35, 80, 55, 40, 90, 65, 50, 30, 75, 85, 42, 68, 58];
        return widths[i % widths.length] ?? 50;
      }),
    [],
  );

  return (
    <div className="flex h-full">
      {/* Line number gutter skeleton */}
      <div className="flex flex-col items-end gap-[5px] px-3 py-4 border-r border-border/30 bg-muted/20 select-none">
        {lines.map((_, i) => (
          <Skeleton key={`ln-${String(i)}`} className="h-[14px] w-5 rounded-sm opacity-30" />
        ))}
      </div>
      {/* Code lines skeleton */}
      <div className="flex-1 flex flex-col gap-[5px] px-4 py-4">
        {lines.map((width, i) => (
          <Skeleton
            key={`code-${String(i)}`}
            className="h-[14px] rounded-sm"
            style={{ width: `${String(width)}%`, opacity: 0.15 + (i % 3) * 0.1 }}
          />
        ))}
      </div>
    </div>
  );
};

// --- Error boundary fallback ---
const FileContentError: FC<{ error: Error; onRetry: () => void }> = ({ error, onRetry }) => (
  <div className="flex flex-col items-center justify-center h-full gap-4 px-8 py-12">
    <div className="h-12 w-12 rounded-xl bg-destructive/10 flex items-center justify-center">
      <AlertCircle className="h-6 w-6 text-destructive" />
    </div>
    <div className="text-center space-y-1.5">
      <p className="text-sm font-medium text-destructive">
        <Trans id="assistant.tool.error_loading_file" />
      </p>
      <p className="text-xs text-muted-foreground max-w-sm">{error.message}</p>
    </div>
    <Button variant="outline" size="sm" onClick={onRetry} className="gap-1.5">
      <RefreshCw className="h-3 w-3" />
      <Trans id="assistant.tool.retry" />
    </Button>
  </div>
);

// --- Breadcrumb-style file path display ---
const PathBreadcrumb: FC<{ filePath: string }> = ({ filePath }) => {
  const parts = filePath.split("/").filter(Boolean);
  const fileName = parts.pop() ?? filePath;
  const dirParts = parts.slice(-3); // Show last 3 directory segments
  const hasEllipsis = parts.length > 3;

  return (
    <div
      className={cn(
        "flex items-center gap-0.5 text-[11px] text-muted-foreground flex-wrap",
        codeMonoClass,
      )}
    >
      {hasEllipsis && (
        <>
          <span className="opacity-50">...</span>
          <ChevronRight className="h-2.5 w-2.5 opacity-40 flex-shrink-0" />
        </>
      )}
      {dirParts.map((part, i) => (
        <span key={`${part}-${String(i)}`} className="flex items-center gap-0.5">
          <span className="opacity-60 hover:opacity-100 transition-opacity">{part}</span>
          <ChevronRight className="h-2.5 w-2.5 opacity-40 flex-shrink-0" />
        </span>
      ))}
      <span className="text-foreground font-medium">{fileName}</span>
    </div>
  );
};

// --- Suspense-wrapped file content ---
type FileContentBodyProps = {
  projectId: string;
  filePath: string;
  syntaxTheme: Record<string, React.CSSProperties>;
};

const FileContentBody: FC<FileContentBodyProps> = ({ projectId, filePath, syntaxTheme }) => {
  const { data } = useSuspenseQuery(fileContentQuery(projectId, filePath));

  if (!data.success) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 px-8 py-12">
        <div className="h-12 w-12 rounded-xl bg-destructive/10 flex items-center justify-center">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>
        <div className="text-center space-y-1.5">
          <p className="text-sm font-medium text-destructive">
            {data.error === "NOT_FOUND" && <Trans id="assistant.tool.file_not_found" />}
            {data.error === "BINARY_FILE" && <Trans id="assistant.tool.binary_file" />}
            {data.error === "INVALID_PATH" && <Trans id="assistant.tool.invalid_path" />}
            {data.error === "READ_ERROR" && <Trans id="assistant.tool.read_error" />}
          </p>
          {data.message && <p className="text-xs text-muted-foreground max-w-sm">{data.message}</p>}
        </div>
      </div>
    );
  }

  const language = data.language ?? detectLanguage(filePath);
  const lineCount = data.content.split("\n").length;

  return (
    <div className="flex flex-col h-full">
      {/* Status bar */}
      <div className="flex items-center gap-3 px-4 py-1.5 border-b border-border/40 bg-muted/20 text-[10px] text-muted-foreground select-none">
        {language && (
          <span className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            {language}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Hash className="h-3 w-3" />
          {lineCount} lines
        </span>
        {data.truncated && (
          <Badge
            variant="secondary"
            className="text-[9px] h-4 px-1.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0"
          >
            <Trans id="assistant.tool.file_truncated" />
          </Badge>
        )}
      </div>
      {/* Code content */}
      <div className="flex-1 overflow-auto">
        <SyntaxHighlighter
          style={syntaxTheme}
          language={language}
          showLineNumbers
          wrapLines
          customStyle={{
            margin: 0,
            borderRadius: 0,
            fontSize: "0.75rem",
            lineHeight: "1.5",
            minHeight: "100%",
          }}
          lineNumberStyle={{
            minWidth: "3.5em",
            paddingRight: "1em",
            textAlign: "right",
            userSelect: "none",
            opacity: 0.4,
          }}
        >
          {data.content}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};

// --- Suspense error boundary ---
type ErrorBoundaryProps = {
  children: ReactNode;
  onRetry: () => void;
};
type ErrorBoundaryState = { error: Error | null };

class FileContentErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  override render() {
    if (this.state.error) {
      return (
        <FileContentError
          error={this.state.error}
          onRetry={() => {
            this.setState({ error: null });
            this.props.onRetry();
          }}
        />
      );
    }
    return this.props.children;
  }
}

/**
 * Dialog component for viewing file content with syntax highlighting.
 * Opens instantly with skeleton loading; content loads via Suspense.
 */
export const FileContentDialog: FC<FileContentDialogProps> = ({
  projectId,
  filePaths,
  children,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { resolvedTheme } = useTheme();
  const syntaxTheme = resolvedTheme === "dark" ? oneDark : oneLight;

  const selectedFilePath = filePaths[selectedIndex] ?? filePaths[0];
  const hasMultipleFiles = filePaths.length > 1;

  const fileName = selectedFilePath?.split("/").pop() ?? "";

  const handleOpenChange = useCallback((open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setSelectedIndex(0);
    }
  }, []);

  const handleCopyPath = useCallback(async () => {
    if (selectedFilePath === undefined) return;
    try {
      await navigator.clipboard.writeText(selectedFilePath);
      toast.success("Copied file path");
    } catch {
      toast.error("Failed to copy");
    }
  }, [selectedFilePath]);

  const handleRetry = useCallback(() => {
    // Force re-mount by toggling open state
    setIsOpen(false);
    requestAnimationFrame(() => setIsOpen(true));
  }, []);

  // Default trigger button
  const defaultTrigger = (
    <Button
      variant="ghost"
      size="sm"
      className="h-auto py-1.5 px-3 text-xs hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-none flex items-center gap-1"
      data-testid="file-content-button"
    >
      <Eye className="h-3 w-3" />
      <Trans id="assistant.tool.view_file" />
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children ?? defaultTrigger}</DialogTrigger>
      <DialogContent
        className="w-[95vw] md:w-[90vw] lg:w-[85vw] max-w-[1200px] h-[85vh] max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden"
        data-testid="file-content-dialog"
      >
        {/* Header */}
        <DialogHeader className="px-5 py-3 border-b border-border/60 bg-muted/30 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 rounded-md bg-primary/8 border border-primary/10 flex items-center justify-center">
                <FolderOpen className="h-4 w-4 text-primary/70" />
              </div>
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <DialogTitle className="text-sm font-semibold leading-tight pr-8 flex items-center gap-2">
                <span className={cn("truncate", codeMonoClass)}>{fileName}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 opacity-40 hover:opacity-100 flex-shrink-0"
                  onClick={() => void handleCopyPath()}
                  aria-label="Copy file path"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </DialogTitle>
              <DialogDescription className="text-xs" asChild>
                <div>
                  {hasMultipleFiles ? (
                    <div className="flex items-center gap-2">
                      <Select
                        value={String(selectedIndex)}
                        onValueChange={(value) => setSelectedIndex(Number(value))}
                      >
                        <SelectTrigger
                          className={cn(
                            "h-6 text-[10px] max-w-[500px] border-border/50",
                            codeMonoClass,
                          )}
                          data-testid="file-selector"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {filePaths.map((path, index) => (
                            <SelectItem
                              key={path}
                              value={String(index)}
                              className={cn("text-[10px]", codeMonoClass)}
                            >
                              {path}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Badge
                        variant="outline"
                        className="text-[9px] h-4 px-1.5 border-border/50 text-muted-foreground"
                      >
                        {filePaths.length} files
                      </Badge>
                    </div>
                  ) : (
                    selectedFilePath !== undefined && <PathBreadcrumb filePath={selectedFilePath} />
                  )}
                </div>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Content area with Suspense */}
        <div className="flex-1 min-h-0 overflow-hidden bg-background">
          {selectedFilePath !== undefined && (
            <FileContentErrorBoundary key={selectedFilePath} onRetry={handleRetry}>
              <Suspense fallback={<CodeSkeleton />}>
                <FileContentBody
                  projectId={projectId}
                  filePath={selectedFilePath}
                  syntaxTheme={syntaxTheme}
                />
              </Suspense>
            </FileContentErrorBoundary>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
