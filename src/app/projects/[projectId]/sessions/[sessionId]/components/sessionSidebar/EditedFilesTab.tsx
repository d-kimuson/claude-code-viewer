import { Trans } from "@lingui/react";
import { ChevronRight, FileIcon, FolderIcon } from "lucide-react";
import { type FC, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { extractAllEditedFiles } from "@/lib/file-viewer";
import { cn } from "@/lib/utils";
import { useSession } from "../../hooks/useSession";
import { FileContentDialog } from "../conversationList/FileContentDialog";

type FileTreeNode = {
  name: string;
  path: string;
  isFile: boolean;
  children: Map<string, FileTreeNode>;
  toolName?: string;
};

const buildFileTree = (
  files: readonly { filePath: string; toolName: string }[],
): FileTreeNode => {
  const root: FileTreeNode = {
    name: "",
    path: "",
    isFile: false,
    children: new Map(),
  };

  for (const file of files) {
    const parts = file.filePath.split("/").filter(Boolean);
    let current = root;
    let currentPath = "";

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (part === undefined) continue;

      currentPath = currentPath ? `${currentPath}/${part}` : `/${part}`;
      const isLastPart = i === parts.length - 1;

      if (!current.children.has(part)) {
        current.children.set(part, {
          name: part,
          path: currentPath,
          isFile: isLastPart,
          children: new Map(),
          toolName: isLastPart ? file.toolName : undefined,
        });
      }

      const child = current.children.get(part);
      if (child) {
        current = child;
      }
    }
  }

  return root;
};

const FileTreeItem: FC<{
  node: FileTreeNode;
  projectId: string;
  depth: number;
}> = ({ node, projectId, depth }) => {
  const [isOpen, setIsOpen] = useState(depth < 2);

  if (node.isFile) {
    return (
      <FileContentDialog projectId={projectId} filePaths={[node.path]}>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start h-7 px-2 text-xs font-normal hover:bg-accent"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          <FileIcon className="h-3.5 w-3.5 mr-1.5 flex-shrink-0 text-muted-foreground" />
          <span className="truncate">{node.name}</span>
          {node.toolName && (
            <span className="ml-auto text-[10px] text-muted-foreground">
              {node.toolName}
            </span>
          )}
        </Button>
      </FileContentDialog>
    );
  }

  const children = Array.from(node.children.values()).sort((a, b) => {
    if (a.isFile !== b.isFile) return a.isFile ? 1 : -1;
    return a.name.localeCompare(b.name);
  });

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start h-7 px-2 text-xs font-normal hover:bg-accent"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          <ChevronRight
            className={cn(
              "h-3.5 w-3.5 mr-1 flex-shrink-0 transition-transform",
              isOpen && "rotate-90",
            )}
          />
          <FolderIcon className="h-3.5 w-3.5 mr-1.5 flex-shrink-0 text-muted-foreground" />
          <span className="truncate">{node.name}</span>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        {children.map((child) => (
          <FileTreeItem
            key={child.path}
            node={child}
            projectId={projectId}
            depth={depth + 1}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
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

  const fileTree = useMemo(() => buildFileTree(editedFiles), [editedFiles]);

  if (editedFiles.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground text-center">
        <Trans id="sidebar.edited_files.empty" />
      </div>
    );
  }

  const rootChildren = Array.from(fileTree.children.values()).sort((a, b) => {
    if (a.isFile !== b.isFile) return a.isFile ? 1 : -1;
    return a.name.localeCompare(b.name);
  });

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
      <div className="flex-1 overflow-auto py-1">
        {rootChildren.map((node) => (
          <FileTreeItem
            key={node.path}
            node={node}
            projectId={projectId}
            depth={0}
          />
        ))}
      </div>
    </div>
  );
};
