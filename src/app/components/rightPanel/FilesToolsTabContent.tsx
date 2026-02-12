import { Trans } from "@lingui/react";
import { useQuery } from "@tanstack/react-query";
import {
  BotIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ExternalLinkIcon,
  FileIcon,
  FilterIcon,
  Loader2,
  MessageSquare,
  TerminalIcon,
  WrenchIcon,
  XCircle,
} from "lucide-react";
import { type FC, useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { agentSessionListQuery, agentSessionQuery } from "@/lib/api/queries";
import { extractAllEditedFiles, extractToolCalls } from "@/lib/file-viewer";
import { extractLatestTodos } from "@/lib/todo-viewer";
import { cn } from "@/lib/utils";
import { ConversationList } from "../../projects/[projectId]/sessions/[sessionId]/components/conversationList/ConversationList";
import { FileContentDialog } from "../../projects/[projectId]/sessions/[sessionId]/components/conversationList/FileContentDialog";
import { useSession } from "../../projects/[projectId]/sessions/[sessionId]/hooks/useSession";
import { CollapsibleTodoSection } from "./common/CollapsibleTodoSection";

interface FilesToolsTabContentProps {
  projectId: string;
  sessionId: string;
}

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

const sortByDisplayPath = <T extends { displayPath: string }>(
  files: T[],
): T[] => files.toSorted((a, b) => a.displayPath.localeCompare(b.displayPath));

const groupFilesByProject = (
  files: readonly { filePath: string; toolName: string }[],
  cwd: string | undefined,
): GroupedFiles => {
  if (!cwd) {
    const external = files.map((f) => ({
      ...f,
      displayPath: f.filePath,
    }));
    return {
      internal: [],
      external: sortByDisplayPath(external),
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

  return {
    internal: sortByDisplayPath(internal),
    external: sortByDisplayPath(external),
  };
};

interface CollapsibleSectionProps {
  title: React.ReactNode;
  count: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
  icon?: React.ReactNode;
  /** sticky top position in pixels (for stacking multiple sticky headers) */
  stickyTop?: number;
}

const CollapsibleSection: FC<CollapsibleSectionProps> = ({
  title,
  count,
  defaultOpen = true,
  children,
  icon,
  stickyTop = 0,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  // Use Fragment to keep sticky header and content as siblings in the scroll container
  // This allows sticky positioning to work correctly
  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{ top: stickyTop }}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors sticky bg-background z-10 border-b border-border/40"
      >
        {isOpen ? (
          <ChevronDownIcon className="w-3.5 h-3.5" />
        ) : (
          <ChevronRightIcon className="w-3.5 h-3.5" />
        )}
        {icon}
        <span className="flex-1 text-left">{title}</span>
        <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full">
          {count}
        </span>
      </button>
      {isOpen && (
        <div className="px-1 pb-2 border-b border-border/40">{children}</div>
      )}
    </>
  );
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
        className="w-full justify-start h-auto py-1.5 px-2 text-xs font-normal hover:bg-accent gap-2 rounded-md"
      >
        {isExternal ? (
          <ExternalLinkIcon className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
        ) : (
          <FileIcon className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
        )}
        <span className="truncate text-left flex-1 font-mono text-xs">
          {displayPath}
        </span>
        <span className="text-[10px] text-muted-foreground/70 flex-shrink-0 bg-muted/50 px-1.5 py-0.5 rounded">
          {toolName}
        </span>
      </Button>
    </FileContentDialog>
  );
};

const ToolCallItem: FC<{
  name: string;
  timestamp: string;
  inputSummary: string;
}> = ({ name, timestamp, inputSummary }) => {
  const formattedTime = useMemo(() => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  }, [timestamp]);

  return (
    <div className="flex items-start gap-2 px-2 py-1.5 text-xs hover:bg-muted/30 rounded-md transition-colors">
      <TerminalIcon className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">{name}</span>
          <span className="text-[10px] text-muted-foreground">
            {formattedTime}
          </span>
        </div>
        {inputSummary && (
          <p className="text-[10px] text-muted-foreground truncate mt-0.5 font-mono">
            {inputSummary}
          </p>
        )}
      </div>
    </div>
  );
};

const noopGetToolResult = () => undefined;

const AgentSessionDialog: FC<{
  projectId: string;
  sessionId: string;
  agentId: string;
  title: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}> = ({ projectId, sessionId, agentId, title, isOpen, onOpenChange }) => {
  const { data, isLoading, error, refetch } = useQuery({
    ...agentSessionQuery(projectId, agentId, sessionId),
    enabled: isOpen,
    staleTime: 0,
  });

  const conversations = data?.conversations ?? [];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[95vw] md:w-[90vw] lg:w-[85vw] max-w-[1400px] h-[85vh] max-h-[85vh] flex flex-col p-0"
        data-testid="agent-session-modal"
      >
        <DialogHeader className="px-6 py-4 border-b bg-muted/30">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-1">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg font-semibold leading-tight mb-1 pr-2">
                {title.length > 120 ? `${title.slice(0, 120)}...` : title}
              </DialogTitle>
              <DialogDescription className="text-xs flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1">
                  Agent:{" "}
                  <code className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">
                    {agentId.slice(0, 8)}
                  </code>
                </span>
                <span className="text-muted-foreground">|</span>
                <span>
                  <Trans
                    id="assistant.tool.message_count"
                    values={{ count: conversations.length }}
                  />
                </span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-auto px-6 py-4">
          {isLoading && (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                <Trans id="assistant.tool.loading_task" />
              </p>
            </div>
          )}
          {error !== null && !isLoading && (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <XCircle className="h-8 w-8 text-destructive" />
              <p className="text-sm text-destructive">
                <Trans id="assistant.tool.error_loading_task" />
              </p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <Trans id="assistant.tool.retry" />
              </Button>
            </div>
          )}
          {!isLoading && error === null && conversations.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <p className="text-sm text-muted-foreground">
                <Trans id="assistant.tool.no_task_data" />
              </p>
            </div>
          )}
          {!isLoading && error === null && conversations.length > 0 && (
            <ConversationList
              conversations={conversations.map((c) => ({
                ...c,
                isSidechain: false,
              }))}
              getToolResult={noopGetToolResult}
              projectId={projectId}
              sessionId={sessionId}
              scheduledJobs={[]}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

const AgentSessionItem: FC<{
  agentId: string;
  firstMessage: string | null;
  onClick: () => void;
}> = ({ agentId, firstMessage, onClick }) => {
  const displayText = firstMessage ?? `Agent ${agentId.slice(0, 8)}`;
  const truncated =
    displayText.length > 80 ? `${displayText.slice(0, 80)}...` : displayText;

  return (
    <Button
      variant="ghost"
      size="sm"
      className="w-full justify-start h-auto py-1.5 px-2 text-xs font-normal hover:bg-accent gap-2 rounded-md"
      onClick={onClick}
    >
      <BotIcon className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
      <span className="truncate text-left flex-1 text-xs">{truncated}</span>
      <span className="text-[10px] text-muted-foreground/70 flex-shrink-0 bg-muted/50 px-1.5 py-0.5 rounded font-mono">
        {agentId.slice(0, 8)}
      </span>
    </Button>
  );
};

export const FilesToolsTabContent: FC<FilesToolsTabContentProps> = ({
  projectId,
  sessionId,
}) => {
  const { conversations } = useSession(projectId, sessionId);
  const [selectedTools, setSelectedTools] = useState<Set<string>>(new Set());
  const [openAgentId, setOpenAgentId] = useState<string | null>(null);

  // Agent sessions
  const { data: agentSessionsData } = useQuery({
    ...agentSessionListQuery(projectId, sessionId),
  });
  const agentSessions = agentSessionsData?.agentSessions ?? [];
  const hasAgentSessions = agentSessions.length > 0;

  const openAgentTitle = useMemo(() => {
    if (openAgentId === null) return "";
    const session = agentSessions.find((s) => s.agentId === openAgentId);
    return session?.firstMessage ?? `Agent ${openAgentId.slice(0, 8)}`;
  }, [openAgentId, agentSessions]);

  const handleOpenAgent = useCallback((agentId: string) => {
    setOpenAgentId(agentId);
  }, []);

  const handleCloseAgent = useCallback((open: boolean) => {
    if (!open) setOpenAgentId(null);
  }, []);

  // Edited files
  const editedFiles = useMemo(
    () => extractAllEditedFiles(conversations),
    [conversations],
  );

  // Tool calls
  const toolCalls = useMemo(
    () => extractToolCalls(conversations),
    [conversations],
  );

  // Get unique tool names for filter
  const uniqueToolNames = useMemo(() => {
    const names = new Set(toolCalls.map((tc) => tc.name));
    return Array.from(names).sort();
  }, [toolCalls]);

  // Filtered tool calls
  const filteredToolCalls = useMemo(() => {
    if (selectedTools.size === 0) return toolCalls;
    return toolCalls.filter((tc) => selectedTools.has(tc.name));
  }, [toolCalls, selectedTools]);

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

  // Todo items
  const latestTodos = useMemo(
    () => extractLatestTodos(conversations),
    [conversations],
  );

  const hasEditedFiles = editedFiles.length > 0;
  const hasToolCalls = toolCalls.length > 0;

  const handleToggleTool = (toolName: string) => {
    setSelectedTools((prev) => {
      const next = new Set(prev);
      if (next.has(toolName)) {
        next.delete(toolName);
      } else {
        next.add(toolName);
      }
      return next;
    });
  };

  const handleClearFilter = () => {
    setSelectedTools(new Set());
  };

  if (!hasEditedFiles && !hasToolCalls && !hasAgentSessions) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-xl bg-muted/30 flex items-center justify-center">
              <FileIcon className="w-6 h-6 text-muted-foreground/50" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">
                <Trans id="sidebar.edited_files.empty" />
              </p>
            </div>
          </div>
        </div>
        <CollapsibleTodoSection todos={latestTodos} />
      </div>
    );
  }

  // Section header height: py-2 (16px) + text-xs line-height (16px) + border-b (1px) = 33px
  const sectionHeaderHeight = 33;

  return (
    <div className="flex flex-col h-full">
      {/* Scrollable Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* Edited Files Section */}
        {hasEditedFiles && (
          <CollapsibleSection
            title={<Trans id="panel.files.edited_section" />}
            count={editedFiles.length}
            icon={<FileIcon className="w-3.5 h-3.5" />}
            stickyTop={0}
          >
            {groupedFiles.internal.length > 0 && (
              <div className="space-y-0.5">
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
              <div className="space-y-0.5 mt-2">
                <div className="px-2 py-1 text-[10px] font-medium text-muted-foreground/70 uppercase tracking-wider">
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
          </CollapsibleSection>
        )}

        {/* Tool Calls Section */}
        {hasToolCalls && (
          <CollapsibleSection
            title={<Trans id="panel.files.tool_calls_section" />}
            count={filteredToolCalls.length}
            icon={<WrenchIcon className="w-3.5 h-3.5" />}
            stickyTop={hasEditedFiles ? sectionHeaderHeight : 0}
          >
            {/* Filter */}
            <div className="px-2 pb-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-7 text-xs gap-1.5",
                      selectedTools.size > 0 && "border-primary text-primary",
                    )}
                  >
                    <FilterIcon className="w-3 h-3" />
                    <Trans id="panel.files.filter_tools" />
                    {selectedTools.size > 0 && (
                      <span className="ml-1 px-1 py-0.5 bg-primary/10 rounded text-[10px]">
                        {selectedTools.size}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-48 p-2">
                  <div className="space-y-1">
                    {uniqueToolNames.map((toolName) => (
                      <button
                        type="button"
                        key={toolName}
                        className="flex items-center gap-2 px-2 py-1 hover:bg-muted/50 rounded cursor-pointer w-full text-left"
                        onClick={() => handleToggleTool(toolName)}
                      >
                        <Checkbox
                          checked={selectedTools.has(toolName)}
                          onCheckedChange={() => handleToggleTool(toolName)}
                        />
                        <span className="text-xs">{toolName}</span>
                      </button>
                    ))}
                  </div>
                  {selectedTools.size > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-2 h-7 text-xs"
                      onClick={handleClearFilter}
                    >
                      Clear filter
                    </Button>
                  )}
                </PopoverContent>
              </Popover>
            </div>

            {/* Tool call list */}
            <div className="space-y-0.5">
              {filteredToolCalls.map((tc) => (
                <ToolCallItem
                  key={tc.id}
                  name={tc.name}
                  timestamp={tc.timestamp}
                  inputSummary={tc.inputSummary}
                />
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Agent Sessions Section */}
        {hasAgentSessions && (
          <CollapsibleSection
            title="Agents"
            count={agentSessions.length}
            icon={<BotIcon className="w-3.5 h-3.5" />}
            stickyTop={
              (hasEditedFiles ? sectionHeaderHeight : 0) +
              (hasToolCalls ? sectionHeaderHeight : 0)
            }
          >
            <div className="space-y-0.5">
              {agentSessions.map((agent) => (
                <AgentSessionItem
                  key={agent.agentId}
                  agentId={agent.agentId}
                  firstMessage={agent.firstMessage}
                  onClick={() => handleOpenAgent(agent.agentId)}
                />
              ))}
            </div>
          </CollapsibleSection>
        )}
      </div>

      {/* Todo Checklist Section - Fixed at bottom */}
      <CollapsibleTodoSection todos={latestTodos} />

      {/* Agent Session Dialog */}
      {openAgentId !== null && (
        <AgentSessionDialog
          projectId={projectId}
          sessionId={sessionId}
          agentId={openAgentId}
          title={openAgentTitle}
          isOpen={true}
          onOpenChange={handleCloseAgent}
        />
      )}
    </div>
  );
};
