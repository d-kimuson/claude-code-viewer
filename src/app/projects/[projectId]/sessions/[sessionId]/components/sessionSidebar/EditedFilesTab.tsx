import { Trans } from "@lingui/react";
import { ExternalLinkIcon, FileIcon } from "lucide-react";
import { type FC, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { extractAllEditedFiles } from "@/lib/file-viewer";
import { useSession } from "../../hooks/useSession";
import { FileContentDialog } from "../conversationList/FileContentDialog";

type GroupedFiles = {
  internal: readonly {
    filePath: string;
    displayPath: string;
    toolName: string;
  }[];
  external: readonly {
    filePath: string;
    displayPath: string;
    toolName: string;
  }[];
};

const groupFilesByProject = (
  files: readonly { filePath: string; toolName: string }[],
  cwd: string | undefined,
): GroupedFiles => {
  if (!cwd) {
    return {
      internal: [],
      external: files.map((f) => ({
        ...f,
        displayPath: f.filePath,
      })),
    };
  }

  const cwdWithSlash = cwd.endsWith("/") ? cwd : `${cwd}/`;
  const internal: {
    filePath: string;
    displayPath: string;
    toolName: string;
  }[] = [];
  const external: {
    filePath: string;
    displayPath: string;
    toolName: string;
  }[] = [];

  for (const file of files) {
    if (file.filePath.startsWith(cwdWithSlash)) {
      internal.push({
        ...file,
        displayPath: file.filePath.slice(cwdWithSlash.length),
      });
    } else if (file.filePath === cwd) {
      internal.push({
        ...file,
        displayPath: ".",
      });
    } else {
      external.push({
        ...file,
        displayPath: file.filePath,
      });
    }
  }

  return { internal, external };
};

const FileListItem: FC<{
  filePath: string;
  displayPath: string;
  toolName: string;
  projectId: string;
  isExternal?: boolean;
}> = ({ filePath, displayPath, toolName, projectId, isExternal }) => {
  return (
    <FileContentDialog projectId={projectId} filePaths={[filePath]}>
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start h-auto py-1.5 px-3 text-xs font-normal hover:bg-accent gap-2"
      >
        {isExternal ? (
          <ExternalLinkIcon className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
        ) : (
          <FileIcon className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
        )}
        <span className="truncate text-left flex-1 font-mono">
          {displayPath}
        </span>
        <span className="text-[10px] text-muted-foreground flex-shrink-0">
          {toolName}
        </span>
      </Button>
    </FileContentDialog>
  );
};

export const EditedFilesTab: FC<{
  projectId: string;
  sessionId: string;
}> = ({ projectId, sessionId }) => {
  const { conversations } = useSession(projectId, sessionId);

  const editedFiles = useMemo(
    () => extractAllEditedFiles(conversations),
    [conversations],
  );

  // Get cwd from the first conversation entry that has it
  const cwd = useMemo(() => {
    for (const conv of conversations) {
      if ("cwd" in conv && typeof conv.cwd === "string") {
        return conv.cwd;
      }
    }
    return undefined;
  }, [conversations]);

  const groupedFiles = useMemo(
    () => groupFilesByProject(editedFiles, cwd),
    [editedFiles, cwd],
  );

  if (editedFiles.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground text-center">
        <Trans id="sidebar.edited_files.empty" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b">
        <h3 className="text-sm font-medium">
          <Trans id="sidebar.edited_files.title" />
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          <Trans
            id="sidebar.edited_files.count"
            values={{ count: editedFiles.length }}
          />
        </p>
      </div>
      <div className="flex-1 overflow-auto">
        {groupedFiles.internal.length > 0 && (
          <div className="py-1">
            {groupedFiles.external.length > 0 && (
              <div className="px-3 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                <Trans id="sidebar.edited_files.internal" />
              </div>
            )}
            {groupedFiles.internal.map((file) => (
              <FileListItem
                key={file.filePath}
                filePath={file.filePath}
                displayPath={file.displayPath}
                toolName={file.toolName}
                projectId={projectId}
              />
            ))}
          </div>
        )}
        {groupedFiles.external.length > 0 && (
          <div className="py-1 border-t">
            <div className="px-3 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              <Trans id="sidebar.edited_files.external" />
            </div>
            {groupedFiles.external.map((file) => (
              <FileListItem
                key={file.filePath}
                filePath={file.filePath}
                displayPath={file.displayPath}
                toolName={file.toolName}
                projectId={projectId}
                isExternal
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
