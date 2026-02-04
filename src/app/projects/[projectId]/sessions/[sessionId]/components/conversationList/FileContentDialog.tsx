import { Trans } from "@lingui/react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Eye, FileCode, Loader2 } from "lucide-react";
import { type FC, useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  oneDark,
  oneLight,
} from "react-syntax-highlighter/dist/esm/styles/prism";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { fileContentQuery } from "@/lib/api/queries";
import { detectLanguage } from "@/lib/file-viewer/detectLanguage";
import { useTheme } from "../../../../../../../hooks/useTheme";

type FileContentDialogProps = {
  projectId: string;
  filePath: string;
};

/**
 * Dialog component for viewing file content with syntax highlighting.
 * Fetches file content from API when opened and displays it with appropriate
 * syntax highlighting based on file extension.
 */
export const FileContentDialog: FC<FileContentDialogProps> = ({
  projectId,
  filePath,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { resolvedTheme } = useTheme();
  const syntaxTheme = resolvedTheme === "dark" ? oneDark : oneLight;

  // Only fetch when dialog is open
  const { data, isLoading, error, refetch } = useQuery({
    ...fileContentQuery(projectId, filePath),
    enabled: isOpen,
  });

  // Extract filename from path for display
  const fileName = filePath.split("/").pop() ?? filePath;

  // Determine language for syntax highlighting
  // Use API-provided language if available, otherwise detect from path
  const language =
    data?.success === true ? data.language : detectLanguage(filePath);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-auto py-1.5 px-3 text-xs hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-none flex items-center gap-1"
          data-testid="file-content-button"
        >
          <Eye className="h-3 w-3" />
          <Trans id="assistant.tool.view_file" />
        </Button>
      </DialogTrigger>
      <DialogContent
        className="w-[95vw] md:w-[90vw] lg:w-[85vw] max-w-[1200px] h-[85vh] max-h-[85vh] flex flex-col p-0"
        data-testid="file-content-dialog"
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
              <DialogDescription className="text-xs flex items-center gap-2 flex-wrap">
                <code className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono break-all">
                  {filePath}
                </code>
                {data?.success === true && data.truncated && (
                  <Badge variant="secondary" className="text-[10px]">
                    <Trans id="assistant.tool.file_truncated" />
                  </Badge>
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-auto">
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
              {data.message && (
                <p className="text-xs text-muted-foreground text-center max-w-md">
                  {data.message}
                </p>
              )}
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
        </div>
      </DialogContent>
    </Dialog>
  );
};
