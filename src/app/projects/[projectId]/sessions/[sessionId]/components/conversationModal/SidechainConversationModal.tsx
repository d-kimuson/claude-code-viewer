"use client";

import { Eye } from "lucide-react";
import type { FC } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Conversation } from "@/lib/conversation-schema";
import type { ToolResultContent } from "@/lib/conversation-schema/content/ToolResultContentSchema";
import { ConversationList } from "../conversationList/ConversationList";

type SidechainConversationModalProps = {
  conversation: Conversation;
  sidechainConversations: Conversation[];
  getToolResult: (toolUseId: string) => ToolResultContent | undefined;
};

const sidechainTitle = (conversations: Conversation[]): string => {
  const firstConversation = conversations.at(0);

  const defaultTitle = `${conversations.length} conversations (${
    firstConversation?.type !== "summary" ? firstConversation?.uuid : ""
  })`;

  if (!firstConversation) {
    return defaultTitle;
  }

  if (firstConversation.type !== "user") {
    return defaultTitle;
  }

  const textContent =
    typeof firstConversation.message.content === "string"
      ? firstConversation.message.content
      : (() => {
          const firstContent = firstConversation.message.content.at(0);
          if (firstContent === undefined) return null;

          if (typeof firstContent === "string") return firstContent;
          if (firstContent.type === "text") return firstContent.text;

          return null;
        })();

  return textContent ?? defaultTitle;
};

export const SidechainConversationModal: FC<
  SidechainConversationModalProps
> = ({ conversation, sidechainConversations, getToolResult }) => {
  const title = sidechainTitle(sidechainConversations);

  const rootUuid =
    conversation.type !== "summary" ? conversation.uuid : conversation.leafUuid;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="w-full mb-3 items-center justify-start"
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <Eye className="h-4 w-4 flex-shrink-0" />
            <span className="overflow-hidden text-ellipsis">
              View Task: {title}
            </span>
          </div>
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] md:w-[90vw] max-h-[80vh] overflow-hidden flex flex-col px-2 md:px-8">
        <DialogHeader>
          <DialogTitle>
            {title.length > 100 ? `${title.slice(0, 100)}...` : title}
          </DialogTitle>
          <DialogDescription>Root UUID: {rootUuid}</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-auto">
          <ConversationList
            conversations={sidechainConversations}
            getToolResult={getToolResult}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
