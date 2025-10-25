import type { ToolResultContent } from "@claude-code-viewer/shared/conversation-schema/content/ToolResultContentSchema";
import type {
  Conversation,
  SidechainConversation,
} from "@claude-code-viewer/shared/conversation-schema/index";
import { extractFirstUserText } from "@claude-code-viewer/shared/functions/extractFirstUserText";
import { Trans } from "@lingui/react";
import { Eye, MessageSquare } from "lucide-react";
import type { FC } from "react";
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
import { ConversationList } from "../conversationList/ConversationList";

type SidechainConversationModalProps = {
  conversation: SidechainConversation;
  sidechainConversations: Conversation[];
  trigger?: React.ReactNode;
  getToolResult: (toolUseId: string) => ToolResultContent | undefined;
};

const sidechainTitle = (conversations: Conversation[]): string => {
  const firstConversation = conversations.at(0);

  const defaultTitle = `${conversations.length} conversations (${
    firstConversation?.type !== "summary" &&
    firstConversation?.type !== "file-history-snapshot"
      ? firstConversation?.uuid
      : ""
  })`;

  if (!firstConversation) {
    return defaultTitle;
  }

  return extractFirstUserText(firstConversation) ?? defaultTitle;
};

export const SidechainConversationModal: FC<
  SidechainConversationModalProps
> = ({ conversation, sidechainConversations, trigger, getToolResult }) => {
  const title = sidechainTitle(sidechainConversations);
  const rootUuid = conversation.uuid;
  const messageCount = sidechainConversations.length;

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button
            variant="outline"
            size="sm"
            className="w-full my-2 items-center justify-start hover:bg-accent transition-colors"
            data-testid="sidechain-task-button"
          >
            <div className="flex items-center gap-2 overflow-hidden w-full">
              <Eye className="h-4 w-4 flex-shrink-0 text-primary" />
              <span className="overflow-hidden text-ellipsis text-left flex-1">
                <Trans id="assistant.tool.view_task" message="View Task" />:{" "}
                {title}
              </span>
              <Badge
                variant="secondary"
                className="ml-auto flex-shrink-0 text-xs"
              >
                {messageCount}
              </Badge>
            </div>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent
        className="w-[95vw] md:w-[90vw] lg:w-[85vw] max-w-[1400px] h-[85vh] max-h-[85vh] flex flex-col p-0"
        data-testid="sidechain-task-modal"
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
                <span className="flex items-center gap-1">
                  <Trans id="assistant.tool.task_id" message="Task ID" />:{" "}
                  <code className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">
                    {rootUuid.slice(0, 8)}
                  </code>
                </span>
                <span className="text-muted-foreground">•</span>
                <span>
                  <Trans
                    id="assistant.tool.message_count"
                    message="{count} messages"
                    values={{ count: messageCount }}
                  />
                </span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-auto px-6 py-4">
          <ConversationList
            conversations={sidechainConversations}
            getToolResult={getToolResult}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
