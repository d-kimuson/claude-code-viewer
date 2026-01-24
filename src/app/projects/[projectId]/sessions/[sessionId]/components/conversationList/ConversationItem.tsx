import { useLingui } from "@lingui/react";
import type { FC } from "react";
import type {
  Conversation,
  SidechainConversation,
} from "@/lib/conversation-schema";
import type { ToolResultContent } from "@/lib/conversation-schema/content/ToolResultContentSchema";
import { formatLocaleDate } from "@/lib/date/formatLocaleDate";
import type { SupportedLocale } from "@/lib/i18n/schema";
import { AssistantConversationContent } from "./AssistantConversationContent";
import { FileHistorySnapshotConversationContent } from "./FileHistorySnapshotConversationContent";
import { MetaConversationContent } from "./MetaConversationContent";
import { QueueOperationConversationContent } from "./QueueOperationConversationContent";
import { SummaryConversationContent } from "./SummaryConversationContent";
import { SystemConversationContent } from "./SystemConversationContent";
import { TurnDuration } from "./TurnDuration";
import { UserConversationContent } from "./UserConversationContent";

export const ConversationItem: FC<{
  conversation: Conversation;
  getToolResult: (toolUseId: string) => ToolResultContent | undefined;
  getAgentIdForToolUse: (toolUseId: string) => string | undefined;
  getTurnDuration: (uuid: string) => number | undefined;
  isRootSidechain: (conversation: Conversation) => boolean;
  getSidechainConversationByAgentId: (
    agentId: string,
  ) => SidechainConversation | undefined;
  getSidechainConversationByPrompt: (
    prompt: string,
  ) => SidechainConversation | undefined;
  getSidechainConversations: (rootUuid: string) => SidechainConversation[];
  existsRelatedTaskCall: (prompt: string) => boolean;
  projectId: string;
  sessionId: string;
  showTimestamp?: boolean;
}> = ({
  conversation,
  getToolResult,
  getAgentIdForToolUse,
  getTurnDuration,
  getSidechainConversationByPrompt,
  getSidechainConversations,
  getSidechainConversationByAgentId,
  projectId,
  sessionId,
  showTimestamp = true,
}) => {
  const { i18n } = useLingui();
  const locale = (i18n.locale as SupportedLocale) || "en";

  if (conversation.type === "summary") {
    return (
      <SummaryConversationContent>
        {conversation.summary}
      </SummaryConversationContent>
    );
  }

  if (conversation.type === "system") {
    // Format system message with full details based on subtype
    const formatSystemMessage = () => {
      const lines: string[] = [];

      // Add subtype label if available
      if ("subtype" in conversation && conversation.subtype) {
        lines.push(`[${conversation.subtype}]`);
      }

      // Add level if available
      if ("level" in conversation && conversation.level) {
        lines.push(`Level: ${conversation.level}`);
      }

      // Handle content field
      if (
        "content" in conversation &&
        typeof conversation.content === "string"
      ) {
        lines.push(`\n${conversation.content}`);
      }

      // Handle stop_hook_summary
      if (conversation.subtype === "stop_hook_summary") {
        lines.push(`Hook Count: ${conversation.hookCount}`);
        lines.push(`Stop Reason: ${conversation.stopReason}`);
        lines.push(
          `Prevented Continuation: ${conversation.preventedContinuation}`,
        );
        lines.push(`Has Output: ${conversation.hasOutput}`);
        if (conversation.hookInfos.length > 0) {
          lines.push(
            `Commands: ${conversation.hookInfos.map((h) => h.command).join(", ")}`,
          );
        }
        if (conversation.hookErrors.length > 0) {
          lines.push(
            `Errors: ${JSON.stringify(conversation.hookErrors, null, 2)}`,
          );
        }
      }

      // Handle turn_duration
      if (conversation.subtype === "turn_duration") {
        lines.push(`Duration: ${(conversation.durationMs / 1000).toFixed(2)}s`);
      }

      // Handle compact_boundary
      if (
        conversation.subtype === "compact_boundary" &&
        conversation.compactMetadata
      ) {
        lines.push(`Trigger: ${conversation.compactMetadata.trigger}`);
        lines.push(`Pre-Tokens: ${conversation.compactMetadata.preTokens}`);
      }

      // Handle api_error
      if (conversation.subtype === "api_error" && "error" in conversation) {
        const error = conversation.error;
        if (error.status !== undefined) {
          lines.push(`Status: ${error.status}`);
        }
        if (error.requestID) {
          lines.push(`Request ID: ${error.requestID}`);
        }
        // Extract error message
        const errorMsg =
          error?.error?.error?.message ||
          error?.error?.message ||
          (error?.error ? JSON.stringify(error.error, null, 2) : null);
        if (errorMsg) {
          lines.push(`Error: ${errorMsg}`);
        }
        // Retry info
        if (conversation.retryAttempt !== undefined) {
          lines.push(
            `Retry: ${conversation.retryAttempt}/${conversation.maxRetries}`,
          );
        }
        if (conversation.retryInMs !== undefined) {
          lines.push(
            `Retry In: ${(conversation.retryInMs / 1000).toFixed(2)}s`,
          );
        }
      }

      // Handle toolUseID
      if ("toolUseID" in conversation && conversation.toolUseID) {
        lines.push(`Tool Use ID: ${conversation.toolUseID}`);
      }

      // Handle slug
      if ("slug" in conversation && conversation.slug) {
        lines.push(`Slug: ${conversation.slug}`);
      }

      return lines.join("\n");
    };

    return (
      <SystemConversationContent>
        {formatSystemMessage()}
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

  if (conversation.type === "user") {
    const userConversationJsx =
      typeof conversation.message.content === "string" ? (
        <UserConversationContent
          content={conversation.message.content}
          id={`message-${conversation.uuid}`}
        />
      ) : (
        <ul className="w-full" id={`message-${conversation.uuid}`}>
          {conversation.message.content.map((content, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: Order is static
            <li key={index}>
              <UserConversationContent content={content} />
            </li>
          ))}
        </ul>
      );

    const timestamp =
      showTimestamp && conversation.timestamp ? (
        <div className="text-xs text-muted-foreground mb-1 px-1 select-none text-right">
          {formatLocaleDate(conversation.timestamp, {
            locale,
            target: "datetime",
          })}
        </div>
      ) : null;

    return conversation.isMeta === true ? (
      // 展開可能にしてデフォで非展開
      <MetaConversationContent>
        <div className="flex flex-col w-full">
          {timestamp}
          {userConversationJsx}
        </div>
      </MetaConversationContent>
    ) : (
      <div className="flex flex-col w-full">
        {timestamp}
        {userConversationJsx}
      </div>
    );
  }

  if (conversation.type === "assistant") {
    const turnDuration = getTurnDuration(conversation.uuid);
    return (
      <div className="w-full">
        {showTimestamp && conversation.timestamp && (
          <div className="text-xs text-muted-foreground mb-1 px-1 select-none text-left">
            {formatLocaleDate(conversation.timestamp, {
              locale,
              target: "datetime",
            })}
          </div>
        )}
        <ul className="w-full">
          {conversation.message.content.map((content, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: Order is static
            <li key={index}>
              <AssistantConversationContent
                content={content}
                getToolResult={getToolResult}
                getAgentIdForToolUse={getAgentIdForToolUse}
                getSidechainConversationByAgentId={
                  getSidechainConversationByAgentId
                }
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
        {turnDuration !== undefined && (
          <TurnDuration durationMs={turnDuration} />
        )}
      </div>
    );
  }

  return null;
};
