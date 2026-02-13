import { Trans } from "@lingui/react";
import { AlertTriangle, ChevronDown, ExternalLink } from "lucide-react";
import { type FC, useCallback, useMemo } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { Conversation } from "@/lib/conversation-schema";
import type { ToolResultContent } from "@/lib/conversation-schema/content/ToolResultContentSchema";
import { calculateDuration } from "@/lib/date/formatDuration";
import { parseUserMessage } from "@/server/core/claude-code/functions/parseUserMessage";
import type { SchedulerJob } from "@/server/core/scheduler/schema";
import type { ErrorJsonl } from "../../../../../../../server/core/types";
import { useSidechain } from "../../hooks/useSidechain";
import { ConversationItem } from "./ConversationItem";
import { ScheduledMessageNotice } from "./ScheduledMessageNotice";

/**
 * Type guard to check if toolUseResult contains agentId.
 * The agentId field is available in newer Claude Code versions
 * where agent sessions are stored in separate agent-*.jsonl files.
 */
const hasAgentId = (
  toolUseResult: unknown,
): toolUseResult is { agentId: string } => {
  return (
    typeof toolUseResult === "object" &&
    toolUseResult !== null &&
    "agentId" in toolUseResult &&
    typeof (toolUseResult as { agentId: unknown }).agentId === "string"
  );
};

const getConversationKey = (conversation: Conversation) => {
  if (conversation.type === "user") {
    return `user_${conversation.uuid}`;
  }

  if (conversation.type === "assistant") {
    return `assistant_${conversation.uuid}`;
  }

  if (conversation.type === "system") {
    return `system_${conversation.uuid}`;
  }

  if (conversation.type === "summary") {
    return `summary_${conversation.leafUuid}`;
  }

  if (conversation.type === "file-history-snapshot") {
    return `file-history-snapshot_${conversation.messageId}`;
  }

  if (conversation.type === "queue-operation") {
    return `queue-operation_${conversation.operation}_${conversation.sessionId}_${conversation.timestamp}`;
  }

  if (conversation.type === "progress") {
    return `progress_${conversation.uuid}`;
  }

  if (conversation.type === "custom-title") {
    return `custom-title_${conversation.sessionId}_${conversation.customTitle}`;
  }

  if (conversation.type === "agent-name") {
    return `agent-name_${conversation.sessionId}_${conversation.agentName}`;
  }

  conversation satisfies never;
  throw new Error(`Unknown conversation type: ${conversation}`);
};

const SchemaErrorDisplay: FC<{ errorLine: string }> = ({ errorLine }) => {
  return (
    <li className="w-full flex justify-start">
      <div className="w-full max-w-3xl lg:max-w-4xl sm:w-[90%] md:w-[85%] px-2">
        <Collapsible>
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between cursor-pointer hover:bg-muted/50 rounded p-2 -mx-2 border-l-2 border-red-400">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-3 w-3 text-red-500" />
                <span className="text-xs font-medium text-red-600">
                  <Trans id="conversation.error.schema" />
                </span>
              </div>
              <ChevronDown className="h-3 w-3 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="bg-background rounded border border-red-200 p-3 mt-2">
              <div className="space-y-3">
                <Alert
                  variant="destructive"
                  className="border-red-200 bg-red-50"
                >
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle className="text-red-800">
                    <Trans id="conversation.error.schema_validation" />
                  </AlertTitle>
                  <AlertDescription className="text-red-700">
                    <Trans id="conversation.error.schema_validation.description" />{" "}
                    <a
                      href="https://github.com/d-kimuson/claude-code-viewer/issues"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-red-600 hover:text-red-800 underline underline-offset-4"
                    >
                      <Trans id="conversation.error.report_issue" />
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </AlertDescription>
                </Alert>
                <div className="bg-gray-50 border rounded px-3 py-2">
                  <h5 className="text-xs font-medium text-gray-700 mb-2">
                    <Trans id="conversation.error.raw_content" />
                  </h5>
                  <pre className="text-xs overflow-x-auto whitespace-pre-wrap break-all font-mono text-gray-800">
                    {errorLine}
                  </pre>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </li>
  );
};

type ConversationListProps = {
  conversations: (Conversation | ErrorJsonl)[];
  getToolResult: (toolUseId: string) => ToolResultContent | undefined;
  projectId: string;
  sessionId: string;
  scheduledJobs: SchedulerJob[];
};

export const ConversationList: FC<ConversationListProps> = ({
  conversations,
  getToolResult,
  projectId,
  sessionId,
  scheduledJobs,
}) => {
  const validConversations = useMemo(
    () =>
      conversations.filter((conversation) => conversation.type !== "x-error"),
    [conversations],
  );
  const {
    isRootSidechain,
    getSidechainConversations,
    getSidechainConversationByPrompt,
    getSidechainConversationByAgentId,
    existsRelatedTaskCall,
  } = useSidechain(validConversations);

  // Build a map of assistant UUID -> turn duration (ms)
  // Turn duration = time from the starting user message to the last assistant message of the turn
  // A turn starts with a real user message and ends when the next real user message arrives
  // Only the LAST assistant message in each turn gets a duration
  const turnDurationMap = useMemo(() => {
    const map = new Map<string, number>();

    // Helper to check if a user message is a real user input (not a tool result)
    const isRealUserMessage = (conv: Conversation): boolean => {
      if (conv.type !== "user" || conv.isSidechain) {
        return false;
      }
      // Tool result messages have array content starting with tool_result
      const content = conv.message.content;
      if (Array.isArray(content)) {
        const firstItem = content[0];
        if (
          typeof firstItem === "object" &&
          firstItem !== null &&
          "type" in firstItem &&
          firstItem.type === "tool_result"
        ) {
          return false;
        }
      }
      return true;
    };

    // First, identify turn boundaries (indices of real user messages)
    const turnStartIndices: number[] = [];
    for (let i = 0; i < validConversations.length; i++) {
      const conv = validConversations[i];
      if (conv !== undefined && isRealUserMessage(conv)) {
        turnStartIndices.push(i);
      }
    }

    // For each turn, find the last assistant message and calculate duration
    for (let turnIdx = 0; turnIdx < turnStartIndices.length; turnIdx++) {
      const turnStartIndex = turnStartIndices[turnIdx];
      if (turnStartIndex === undefined) {
        continue;
      }
      const turnEndIndex =
        turnStartIndices[turnIdx + 1] ?? validConversations.length;
      const turnStartConv = validConversations[turnStartIndex];

      if (turnStartConv === undefined || turnStartConv.type !== "user") {
        continue;
      }

      // Find the last non-sidechain assistant message in this turn
      let lastAssistantInTurn: (typeof validConversations)[number] | null =
        null;
      for (let i = turnStartIndex + 1; i < turnEndIndex; i++) {
        const conv = validConversations[i];
        if (
          conv !== undefined &&
          conv.type === "assistant" &&
          !conv.isSidechain
        ) {
          lastAssistantInTurn = conv;
        }
      }

      // Calculate duration from turn start to last assistant message
      if (lastAssistantInTurn !== null) {
        const duration = calculateDuration(
          turnStartConv.timestamp,
          lastAssistantInTurn.timestamp,
        );
        if (duration !== null && duration >= 0) {
          map.set(lastAssistantInTurn.uuid, duration);
        }
      }
    }

    return map;
  }, [validConversations]);

  const getTurnDuration = useCallback(
    (uuid: string): number | undefined => {
      return turnDurationMap.get(uuid);
    },
    [turnDurationMap],
  );

  // Build a map of tool_use_id -> agentId from user entries with toolUseResult
  const toolUseIdToAgentIdMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const conv of validConversations) {
      if (conv.type !== "user") continue;
      const messageContent = conv.message.content;
      if (typeof messageContent === "string") continue;

      for (const content of messageContent) {
        // content can be string or object - need to check type
        if (typeof content === "string") continue;
        if (content.type === "tool_result") {
          const toolUseResult = conv.toolUseResult;
          if (hasAgentId(toolUseResult)) {
            map.set(content.tool_use_id, toolUseResult.agentId);
          }
        }
      }
    }
    return map;
  }, [validConversations]);

  const getAgentIdForToolUse = useCallback(
    (toolUseId: string): string | undefined => {
      return toolUseIdToAgentIdMap.get(toolUseId);
    },
    [toolUseIdToAgentIdMap],
  );

  // Helper to check if a conversation is a user message containing only tool results
  const isOnlyToolResult = useCallback((conv: Conversation): boolean => {
    if (conv.type !== "user") return false;
    const content = conv.message.content;
    if (typeof content === "string") return false;

    // Check if every item in the content array is a tool_result
    return content.every(
      (item) => typeof item !== "string" && item.type === "tool_result",
    );
  }, []);

  // Helper to check if a conversation should be rendered
  const shouldRenderConversation = useCallback(
    (conv: Conversation | ErrorJsonl): boolean => {
      if (conv.type === "x-error") return true;

      // Existing checks
      if (conv.type === "progress") return false;
      if (conv.type === "custom-title") return false;
      if (conv.type === "agent-name") return false;

      const isSidechain =
        conv.type !== "summary" &&
        conv.type !== "file-history-snapshot" &&
        conv.type !== "queue-operation" &&
        conv.isSidechain;

      if (isSidechain) return false;

      // specific check for ghost tool results
      if (conv.type === "user" && isOnlyToolResult(conv)) {
        return false;
      }

      return true;
    },
    [isOnlyToolResult],
  );

  // Calculate timestamp visibility
  const conversationsWithTimestamp = useMemo(() => {
    return conversations.map((conv) => {
      if (conv.type === "x-error") {
        return { conversation: conv, showTimestamp: false };
      }

      if (!shouldRenderConversation(conv)) {
        return { conversation: conv, showTimestamp: false };
      }

      if (
        conv.type === "summary" ||
        conv.type === "progress" ||
        conv.type === "queue-operation" ||
        conv.type === "file-history-snapshot" ||
        conv.type === "custom-title" ||
        conv.type === "agent-name"
      ) {
        // These types might not have timestamp or are invisible
        return { conversation: conv, showTimestamp: false };
      }

      // Always show timestamp for every message as per new requirement
      const showTimestamp = true;

      return { conversation: conv, showTimestamp };
    });
  }, [conversations, shouldRenderConversation]);

  return (
    <>
      <ul>
        {conversationsWithTimestamp.flatMap(
          ({ conversation, showTimestamp }) => {
            if (!shouldRenderConversation(conversation)) {
              if (conversation.type === "x-error") {
                return (
                  <SchemaErrorDisplay
                    key={`error_${conversation.line}`}
                    errorLine={conversation.line}
                  />
                );
              }
              return [];
            }

            if (conversation.type === "x-error") {
              return (
                <SchemaErrorDisplay
                  key={`error_${conversation.line}`}
                  errorLine={conversation.line}
                />
              );
            }

            const elm = (
              <ConversationItem
                key={getConversationKey(conversation)}
                conversation={conversation}
                getToolResult={getToolResult}
                getAgentIdForToolUse={getAgentIdForToolUse}
                getTurnDuration={getTurnDuration}
                isRootSidechain={isRootSidechain}
                getSidechainConversations={getSidechainConversations}
                getSidechainConversationByAgentId={
                  getSidechainConversationByAgentId
                }
                getSidechainConversationByPrompt={
                  getSidechainConversationByPrompt
                }
                existsRelatedTaskCall={existsRelatedTaskCall}
                projectId={projectId}
                sessionId={sessionId}
                showTimestamp={showTimestamp}
              />
            );

            const isLocalCommandOutput =
              conversation.type === "user" &&
              typeof conversation.message.content === "string" &&
              parseUserMessage(conversation.message.content).kind ===
                "local-command";

            const isSidechain =
              conversation.type !== "summary" &&
              conversation.type !== "file-history-snapshot" &&
              conversation.type !== "queue-operation" &&
              conversation.type !== "progress" &&
              conversation.type !== "custom-title" &&
              conversation.type !== "agent-name" &&
              conversation.isSidechain;

            return [
              <li
                className={`w-full flex ${
                  isSidechain ||
                  isLocalCommandOutput ||
                  conversation.type === "assistant" ||
                  conversation.type === "system" ||
                  conversation.type === "summary"
                    ? "justify-start"
                    : "justify-end"
                } animate-in fade-in slide-in-from-bottom-2 duration-300`}
                key={getConversationKey(conversation)}
              >
                <div className="w-full max-w-3xl lg:max-w-4xl sm:w-[90%] md:w-[85%]">
                  {elm}
                </div>
              </li>,
            ];
          },
        )}
      </ul>
      <ScheduledMessageNotice scheduledJobs={scheduledJobs} />
    </>
  );
};
