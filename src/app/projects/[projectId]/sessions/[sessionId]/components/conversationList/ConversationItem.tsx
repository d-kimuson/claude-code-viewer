import type { FC } from "react";
import type {
  Conversation,
  SidechainConversation,
} from "@/lib/conversation-schema";
import type { ToolResultContent } from "@/lib/conversation-schema/content/ToolResultContentSchema";
import { SidechainConversationModal } from "../conversationModal/SidechainConversationModal";
import { AssistantConversationContent } from "./AssistantConversationContent";
import { FileHistorySnapshotConversationContent } from "./FileHistorySnapshotConversationContent";
import { MetaConversationContent } from "./MetaConversationContent";
import { QueueOperationConversationContent } from "./QueueOperationConversationContent";
import { SummaryConversationContent } from "./SummaryConversationContent";
import { SystemConversationContent } from "./SystemConversationContent";
import { UserConversationContent } from "./UserConversationContent";

export const ConversationItem: FC<{
  conversation: Conversation;
  getToolResult: (toolUseId: string) => ToolResultContent | undefined;
  getAgentIdForToolUse: (toolUseId: string) => string | undefined;
  isRootSidechain: (conversation: Conversation) => boolean;
  getSidechainConversationByPrompt: (
    prompt: string,
  ) => SidechainConversation | undefined;
  getSidechainConversations: (rootUuid: string) => SidechainConversation[];
  existsRelatedTaskCall: (prompt: string) => boolean;
  projectId: string;
  sessionId: string;
}> = ({
  conversation,
  getToolResult,
  getAgentIdForToolUse,
  isRootSidechain,
  getSidechainConversationByPrompt,
  getSidechainConversations,
  existsRelatedTaskCall,
  projectId,
  sessionId,
}) => {
  if (conversation.type === "summary") {
    return (
      <SummaryConversationContent>
        {conversation.summary}
      </SummaryConversationContent>
    );
  }

  if (conversation.type === "system") {
    return (
      <SystemConversationContent>
        {conversation.content}
      </SystemConversationContent>
    );
  }

  if (conversation.type === "file-history-snapshot") {
    return (
      <FileHistorySnapshotConversationContent conversation={conversation} />
    );
  }

  if (conversation.type === "queue-operation") {
    return <QueueOperationConversationContent conversation={conversation} />;
  }

  // sidechain = サブタスクのこと
  if (conversation.isSidechain) {
    // Root 以外はモーダルで中身を表示するのでここでは描画しない
    if (!isRootSidechain(conversation)) {
      return null;
    }

    if (conversation.type !== "user") {
      return null;
    }

    const prompt = conversation.message.content;

    if (typeof prompt === "string" && existsRelatedTaskCall(prompt) === true) {
      return null;
    }

    return (
      <SidechainConversationModal
        conversation={conversation}
        sidechainConversations={getSidechainConversations(
          conversation.uuid,
        ).map((original) => ({
          ...original,
          isSidechain: false,
        }))}
        getToolResult={getToolResult}
        projectId={projectId}
        sessionId={sessionId}
      />
    );
  }

  if (conversation.type === "user") {
    const userConversationJsx =
      typeof conversation.message.content === "string" ? (
        <UserConversationContent
          content={conversation.message.content}
          id={`message-${conversation.uuid}`}
        />
      ) : (
        <ul className="w-full" id={`message-${conversation.uuid}`}>
          {conversation.message.content.map((content) => (
            <li key={content.toString()}>
              <UserConversationContent content={content} />
            </li>
          ))}
        </ul>
      );

    return conversation.isMeta === true ? (
      // 展開可能にしてデフォで非展開
      <MetaConversationContent>{userConversationJsx}</MetaConversationContent>
    ) : (
      userConversationJsx
    );
  }

  if (conversation.type === "assistant") {
    return (
      <ul className="w-full">
        {conversation.message.content.map((content) => (
          <li key={content.toString()}>
            <AssistantConversationContent
              content={content}
              getToolResult={getToolResult}
              getAgentIdForToolUse={getAgentIdForToolUse}
              getSidechainConversationByPrompt={
                getSidechainConversationByPrompt
              }
              getSidechainConversations={getSidechainConversations}
              projectId={projectId}
              sessionId={sessionId}
            />
          </li>
        ))}
      </ul>
    );
  }

  return null;
};
