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
import type { ToolResultContent } from "@/lib/conversation-schema/content/ToolResultContentSchema";
import { extractFirstUserText } from "../../../../../../../server/core/session/functions/extractFirstUserText";
import { ConversationList } from "./ConversationList";

type AgentSessionTaskModalProps = {
  prompt: string;
  projectId: string;
  sessionId: string;
  getToolResult: (toolUseId: string) => ToolResultContent | undefined;
};

/**
 * Agent session task modal component for Claude Code v2.0.28+.
 * Displays task details fetched from a separate agent-*.jsonl file via API.
 * Always shows the button for Task tools, fetching data on modal open.
 */
export const AgentSessionTaskModal: FC<AgentSessionTaskModalProps> = ({
  prompt,
  projectId,
  sessionId,
  getToolResult,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    ...agentSessionQuery(projectId, sessionId, prompt),
    enabled: isOpen,
    staleTime: 0,
  });

  const conversations = data?.conversations ?? [];
  const agentSessionId = data?.agentSessionId;

  const title = (() => {
    const firstConversation = conversations.at(0);
    if (!firstConversation) {
      return prompt.length > 60 ? `${prompt.slice(0, 60)}...` : prompt;
    }
    return extractFirstUserText(firstConversation) ?? prompt;
  })();

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-auto py-1.5 px-3 text-xs hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-none flex items-center gap-1"
          data-testid="agent-session-task-button"
        >
          <Eye className="h-3 w-3" />
          <Trans id="assistant.tool.view_task_details" />
        </Button>
      </DialogTrigger>
      <DialogContent
        className="w-[95vw] md:w-[90vw] lg:w-[85vw] max-w-[1400px] h-[85vh] max-h-[85vh] flex flex-col p-0"
        data-testid="agent-session-task-modal"
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
                {agentSessionId && (
                  <>
                    <span className="flex items-center gap-1">
                      <Trans id="assistant.tool.task_id" />:{" "}
                      <code className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">
                        {agentSessionId.slice(0, 8)}
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
          {isLoading && (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                <Trans id="assistant.tool.loading_task" />
              </p>
            </div>
          )}
          {error && (
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
          {!isLoading && !error && conversations.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <Badge variant="secondary" className="text-sm">
                <Trans id="assistant.tool.no_task_data" />
              </Badge>
              <p className="text-xs text-muted-foreground max-w-md text-center">
                <Trans id="assistant.tool.no_task_data_description" />
              </p>
            </div>
          )}
          {!isLoading && !error && conversations.length > 0 && (
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
