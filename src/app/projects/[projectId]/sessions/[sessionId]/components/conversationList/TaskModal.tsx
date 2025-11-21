import { Trans } from "@lingui/react";
import { useQuery } from "@tanstack/react-query";
import { Eye, Loader2, MessageSquare, XCircle } from "lucide-react";
import { type FC, useState } from "react";
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
import { agentSessionQuery } from "@/lib/api/queries";
import type { SidechainConversation } from "@/lib/conversation-schema";
import type { ToolResultContent } from "@/lib/conversation-schema/content/ToolResultContentSchema";
import { extractFirstUserText } from "../../../../../../../server/core/session/functions/extractFirstUserText";
import { ConversationList } from "./ConversationList";

type TaskModalProps = {
  prompt: string;
  projectId: string;
  sessionId: string;
  getSidechainConversationByPrompt: (
    prompt: string,
  ) => SidechainConversation | undefined;
  getSidechainConversations: (rootUuid: string) => SidechainConversation[];
  getToolResult: (toolUseId: string) => ToolResultContent | undefined;
};

/**
 * Task modal component with fallback logic.
 * Always shows the "View Task" button for Task tools.
 *
 * Fallback strategy:
 * 1. First check legacy sidechain data (embedded in same session file)
 * 2. If legacy data exists (length > 0), display it without API request
 * 3. If legacy data is empty, fetch from agent session API endpoint
 *
 * This approach supports both old Claude Code versions (embedded sidechain)
 * and new versions (separate agent-*.jsonl files) without version detection.
 */
export const TaskModal: FC<TaskModalProps> = ({
  prompt,
  projectId,
  sessionId,
  getSidechainConversationByPrompt,
  getSidechainConversations,
  getToolResult,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Check legacy sidechain data first
  const legacyConversation = getSidechainConversationByPrompt(prompt);
  const legacySidechainConversations =
    legacyConversation !== undefined
      ? getSidechainConversations(legacyConversation.uuid)
      : [];
  const hasLegacyData = legacySidechainConversations.length > 0;

  // Only fetch from API if legacy data is not available and modal is open
  const shouldFetchFromApi = isOpen && !hasLegacyData;

  const { data, isLoading, error, refetch } = useQuery({
    ...agentSessionQuery(projectId, sessionId, prompt),
    enabled: shouldFetchFromApi,
    staleTime: 0,
  });

  // Determine which data source to use
  const conversations = hasLegacyData
    ? legacySidechainConversations.map((original) => ({
        ...original,
        isSidechain: false,
      }))
    : (data?.conversations ?? []);

  const agentSessionId = hasLegacyData ? undefined : data?.agentSessionId;
  const taskId = hasLegacyData ? legacyConversation?.uuid : agentSessionId;

  const title = (() => {
    const firstConversation = conversations.at(0);
    if (!firstConversation) {
      return prompt.length > 60 ? `${prompt.slice(0, 60)}...` : prompt;
    }
    return extractFirstUserText(firstConversation) ?? prompt;
  })();

  // Determine loading/error states (only applicable when using API)
  const showLoading = shouldFetchFromApi && isLoading;
  const showError = shouldFetchFromApi && error !== null;
  const showNoData =
    !showLoading && !showError && conversations.length === 0 && isOpen;
  const showConversations =
    !showLoading && !showError && conversations.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-auto py-1.5 px-3 text-xs hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-none flex items-center gap-1"
          data-testid="task-modal-button"
        >
          <Eye className="h-3 w-3" />
          <Trans id="assistant.tool.view_task_details" />
        </Button>
      </DialogTrigger>
      <DialogContent
        className="w-[95vw] md:w-[90vw] lg:w-[85vw] max-w-[1400px] h-[85vh] max-h-[85vh] flex flex-col p-0"
        data-testid="task-modal"
      >
        <DialogHeader className="px-6 py-4 border-b bg-muted/30">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-1">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg font-semibold leading-tight mb-1">
                {title.length > 120 ? `${title.slice(0, 120)}...` : title}
              </DialogTitle>
              <DialogDescription className="text-xs flex items-center gap-2 flex-wrap">
                {taskId !== undefined && taskId !== null && (
                  <>
                    <span className="flex items-center gap-1">
                      <Trans id="assistant.tool.task_id" />:{" "}
                      <code className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">
                        {taskId.slice(0, 8)}
                      </code>
                    </span>
                    <span className="text-muted-foreground">|</span>
                  </>
                )}
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
          {showLoading && (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                <Trans id="assistant.tool.loading_task" />
              </p>
            </div>
          )}
          {showError && (
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
          {showNoData && (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <Badge variant="secondary" className="text-sm">
                <Trans id="assistant.tool.no_task_data" />
              </Badge>
              <p className="text-xs text-muted-foreground max-w-md text-center">
                <Trans id="assistant.tool.no_task_data_description" />
              </p>
            </div>
          )}
          {showConversations && (
            <ConversationList
              conversations={[...conversations]}
              getToolResult={getToolResult}
              projectId={projectId}
              sessionId={sessionId}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
