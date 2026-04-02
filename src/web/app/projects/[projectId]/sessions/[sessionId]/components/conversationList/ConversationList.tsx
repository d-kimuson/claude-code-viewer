import { Trans } from "@lingui/react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  SearchIcon,
  XIcon,
} from "lucide-react";
import { type FC, type RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { parseUserMessage } from "@/lib/claude-code/parseUserMessage";
import type { Conversation } from "@/lib/conversation-schema";
import type { ToolResultContent } from "@/lib/conversation-schema/content/ToolResultContentSchema";
import type { AssistantMessageContent } from "@/lib/conversation-schema/message/AssistantMessageSchema";
import { calculateDuration } from "@/lib/date/formatDuration";
import type { SchedulerJob } from "@/server/core/scheduler/schema";
import type { ErrorJsonl } from "@/server/core/types";
import { Alert, AlertDescription, AlertTitle } from "@/web/components/ui/alert";
import { Button } from "@/web/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/web/components/ui/collapsible";
import { Input } from "@/web/components/ui/input";
import { useSidechain } from "../../hooks/useSidechain";
import { ConversationItem } from "./ConversationItem";
import { buildRenderableConversationRows } from "./conversationRows";
import { ScheduledMessageNotice } from "./ScheduledMessageNotice";

const searchInputId = "conversation-in-page-search";

/**
 * Type guard to check if toolUseResult contains agentId.
 * The agentId field is available in newer Claude Code versions
 * where agent sessions are stored in separate agent-*.jsonl files.
 */
const hasAgentId = (toolUseResult: unknown): toolUseResult is { agentId: string } => {
  return (
    typeof toolUseResult === "object" &&
    toolUseResult !== null &&
    "agentId" in toolUseResult &&
    typeof (toolUseResult as { agentId: unknown }).agentId === "string"
  );
};

const extractUserContentText = (
  content: Extract<Conversation, { type: "user" }>["message"]["content"],
): string => {
  if (typeof content === "string") {
    return content;
  }

  const parts: string[] = [];
  for (const item of content) {
    if (typeof item === "string") {
      parts.push(item);
      continue;
    }

    if (item.type === "text") {
      parts.push(item.text);
    }
  }

  return parts.join(" ");
};

const extractAssistantContentText = (content: AssistantMessageContent): string => {
  if (content.type === "text") {
    return content.text;
  }

  if (content.type === "thinking") {
    return content.thinking;
  }

  if (content.type === "tool_use") {
    return content.name;
  }

  return "";
};

const getSearchableText = (conversation: Conversation | ErrorJsonl): string => {
  if (conversation.type === "x-error") {
    return conversation.line;
  }

  if (conversation.type === "user") {
    return extractUserContentText(conversation.message.content);
  }

  if (conversation.type === "assistant") {
    return conversation.message.content.map(extractAssistantContentText).join(" ");
  }

  if (conversation.type === "summary") {
    return conversation.summary;
  }

  if (conversation.type === "system" && "content" in conversation) {
    return conversation.content;
  }

  if (conversation.type === "custom-title") {
    return conversation.customTitle;
  }

  if (conversation.type === "last-prompt") {
    return conversation.lastPrompt;
  }

  return "";
};

const getSearchInputElement = (): HTMLInputElement | null => {
  const input = document.getElementById(searchInputId);
  return input instanceof HTMLInputElement ? input : null;
};

const clearActiveSearchHighlights = (root: ParentNode | null) => {
  if (root === null) {
    return;
  }

  const highlights = root.querySelectorAll("mark[data-active-search-highlight='true']");
  for (const highlight of highlights) {
    const parent = highlight.parentNode;
    if (parent === null) {
      continue;
    }

    const textNode = document.createTextNode(highlight.textContent ?? "");
    parent.replaceChild(textNode, highlight);
    parent.normalize();
  }
};

const findTextMatchNode = (
  root: HTMLElement,
  normalizedQuery: string,
): { node: Text; startOffset: number } | null => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);

  while (true) {
    const currentNode = walker.nextNode();
    if (currentNode === null) {
      return null;
    }

    if (!(currentNode instanceof Text)) {
      continue;
    }

    const value = currentNode.nodeValue;
    if (value === null || value === "") {
      continue;
    }

    const normalizedValue = value.toLowerCase();
    const startOffset = normalizedValue.indexOf(normalizedQuery);
    if (startOffset >= 0) {
      return { node: currentNode, startOffset };
    }
  }
};

const SchemaErrorDisplay: FC<{ errorLine: string }> = ({ errorLine }) => {
  return (
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
              <Alert variant="destructive" className="border-red-200 bg-red-50">
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
  );
};

type ConversationListProps = {
  conversations: (Conversation | ErrorJsonl)[];
  getToolResult: (toolUseId: string) => ToolResultContent | undefined;
  projectId: string;
  sessionId: string;
  scheduledJobs: SchedulerJob[];
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  enableInPageSearch?: boolean;
};

export const ConversationList: FC<ConversationListProps> = ({
  conversations,
  getToolResult,
  projectId,
  sessionId,
  scheduledJobs,
  scrollContainerRef,
  enableInPageSearch = false,
}) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [committedSearchQuery, setCommittedSearchQuery] = useState("");
  const [activeMatchPosition, setActiveMatchPosition] = useState(0);
  const highlightRetryRafIdRef = useRef<number | null>(null);
  const rowRefsMap = useRef(new Map<number, HTMLLIElement>());

  const validConversations = useMemo(
    () => conversations.filter((conversation) => conversation.type !== "x-error"),
    [conversations],
  );
  const {
    isRootSidechain,
    getSidechainConversations,
    getSidechainConversationByPrompt,
    getSidechainConversationByAgentId,
    existsRelatedTaskCall,
  } = useSidechain(validConversations);

  const turnDurationMap = useMemo(() => {
    const map = new Map<string, number>();

    const isRealUserMessage = (conv: Conversation): boolean => {
      if (conv.type !== "user" || conv.isSidechain) {
        return false;
      }
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

    const turnStartIndices: number[] = [];
    for (let i = 0; i < validConversations.length; i++) {
      const conv = validConversations[i];
      if (conv !== undefined && isRealUserMessage(conv)) {
        turnStartIndices.push(i);
      }
    }

    for (let turnIdx = 0; turnIdx < turnStartIndices.length; turnIdx++) {
      const turnStartIndex = turnStartIndices[turnIdx];
      if (turnStartIndex === undefined) {
        continue;
      }
      const turnEndIndex = turnStartIndices[turnIdx + 1] ?? validConversations.length;
      const turnStartConv = validConversations[turnStartIndex];

      if (turnStartConv === undefined || turnStartConv.type !== "user") {
        continue;
      }

      let lastAssistantInTurn: (typeof validConversations)[number] | null = null;
      for (let i = turnStartIndex + 1; i < turnEndIndex; i++) {
        const conv = validConversations[i];
        if (conv !== undefined && conv.type === "assistant" && !conv.isSidechain) {
          lastAssistantInTurn = conv;
        }
      }

      if (lastAssistantInTurn !== null) {
        const duration = calculateDuration(turnStartConv.timestamp, lastAssistantInTurn.timestamp);
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

  const toolUseIdToAgentIdMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const conv of validConversations) {
      if (conv.type !== "user") continue;
      const messageContent = conv.message.content;
      if (typeof messageContent === "string") continue;

      for (const content of messageContent) {
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

  const toolUseIdToToolUseResultMap = useMemo(() => {
    const map = new Map<string, unknown>();
    for (const conv of validConversations) {
      if (conv.type !== "user") continue;
      const messageContent = conv.message.content;
      if (typeof messageContent === "string") continue;

      for (const content of messageContent) {
        if (typeof content === "string") continue;
        if (content.type === "tool_result" && conv.toolUseResult !== undefined) {
          map.set(content.tool_use_id, conv.toolUseResult);
        }
      }
    }
    return map;
  }, [validConversations]);

  const getToolUseResult = useCallback(
    (toolUseId: string): unknown => {
      return toolUseIdToToolUseResultMap.get(toolUseId);
    },
    [toolUseIdToToolUseResultMap],
  );

  const isOnlyToolResult = useCallback((conv: Conversation): boolean => {
    if (conv.type !== "user") return false;
    const content = conv.message.content;
    if (typeof content === "string") return false;

    return content.every((item) => typeof item !== "string" && item.type === "tool_result");
  }, []);

  const shouldRenderConversation = useCallback(
    (conv: Conversation | ErrorJsonl): boolean => {
      if (conv.type === "x-error") return true;

      if (conv.type === "progress") return false;
      if (conv.type === "custom-title") return false;
      if (conv.type === "agent-name") return false;
      if (conv.type === "pr-link") return false;
      if (conv.type === "last-prompt") return false;

      const isSidechain =
        conv.type !== "summary" &&
        conv.type !== "file-history-snapshot" &&
        conv.type !== "queue-operation" &&
        conv.isSidechain;

      if (isSidechain) return false;

      if (conv.type === "user" && isOnlyToolResult(conv)) {
        return false;
      }

      return true;
    },
    [isOnlyToolResult],
  );

  const renderableRows = useMemo(() => {
    return buildRenderableConversationRows(conversations, shouldRenderConversation);
  }, [conversations, shouldRenderConversation]);

  const searchableTexts = useMemo(() => {
    return renderableRows.map((row) => getSearchableText(row.conversation).toLowerCase());
  }, [renderableRows]);

  const matchedRowIndices = useMemo(() => {
    if (committedSearchQuery === "") {
      return [];
    }

    const result: number[] = [];
    for (let index = 0; index < searchableTexts.length; index++) {
      const searchableText = searchableTexts[index];
      if (searchableText !== undefined && searchableText.includes(committedSearchQuery)) {
        result.push(index);
      }
    }

    return result;
  }, [committedSearchQuery, searchableTexts]);

  useEffect(() => {
    if (!enableInPageSearch) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "f") {
        event.preventDefault();
        setIsSearchOpen(true);
      }

      if (event.key === "Escape" && isSearchOpen) {
        setIsSearchOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [enableInPageSearch, isSearchOpen]);

  useEffect(() => {
    setActiveMatchPosition(0);
  }, [committedSearchQuery]);

  useEffect(() => {
    if (!isSearchOpen) {
      return;
    }

    requestAnimationFrame(() => {
      const input = getSearchInputElement();
      if (input !== null) {
        input.focus();
        input.select();
      }
    });
  }, [isSearchOpen]);

  const commitSearch = useCallback((query: string) => {
    const normalizedQuery = query.trim().toLowerCase();
    setCommittedSearchQuery(normalizedQuery);
    setActiveMatchPosition(0);
  }, []);

  useEffect(() => {
    if (matchedRowIndices.length === 0) {
      return;
    }

    if (activeMatchPosition >= matchedRowIndices.length) {
      setActiveMatchPosition(0);
      return;
    }

    const rowIndex = matchedRowIndices[activeMatchPosition];
    if (rowIndex === undefined) {
      return;
    }

    const rowElement = rowRefsMap.current.get(rowIndex);
    if (rowElement !== undefined) {
      rowElement.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [activeMatchPosition, matchedRowIndices]);

  useEffect(() => {
    const rootElement = scrollContainerRef.current;
    if (rootElement === null) {
      return;
    }

    if (highlightRetryRafIdRef.current !== null) {
      window.cancelAnimationFrame(highlightRetryRafIdRef.current);
      highlightRetryRafIdRef.current = null;
    }

    clearActiveSearchHighlights(rootElement);

    if (committedSearchQuery === "" || matchedRowIndices.length === 0) {
      return;
    }

    const targetRowIndex = matchedRowIndices[activeMatchPosition];
    if (targetRowIndex === undefined) {
      return;
    }

    const applyHighlight = (retriesLeft: number) => {
      const rowElement = rowRefsMap.current.get(targetRowIndex);
      if (!(rowElement instanceof HTMLElement)) {
        if (retriesLeft > 0) {
          highlightRetryRafIdRef.current = window.requestAnimationFrame(() => {
            applyHighlight(retriesLeft - 1);
          });
        }
        return;
      }

      const match = findTextMatchNode(rowElement, committedSearchQuery);
      if (match === null) {
        if (retriesLeft > 0) {
          highlightRetryRafIdRef.current = window.requestAnimationFrame(() => {
            applyHighlight(retriesLeft - 1);
          });
        }
        return;
      }

      const markElement = document.createElement("mark");
      markElement.dataset.activeSearchHighlight = "true";
      markElement.className = "rounded bg-yellow-200 px-0.5 text-foreground dark:bg-yellow-700/70";

      const range = document.createRange();
      range.setStart(match.node, match.startOffset);
      range.setEnd(match.node, match.startOffset + committedSearchQuery.length);
      range.surroundContents(markElement);
      highlightRetryRafIdRef.current = null;
    };

    applyHighlight(6);
  }, [activeMatchPosition, committedSearchQuery, matchedRowIndices, scrollContainerRef]);

  useEffect(() => {
    const rootElement = scrollContainerRef.current;

    return () => {
      if (highlightRetryRafIdRef.current !== null) {
        window.cancelAnimationFrame(highlightRetryRafIdRef.current);
      }
      clearActiveSearchHighlights(rootElement);
    };
  }, [scrollContainerRef]);

  const jumpToPreviousMatch = () => {
    if (matchedRowIndices.length === 0) {
      return;
    }

    setActiveMatchPosition((current) =>
      current === 0 ? matchedRowIndices.length - 1 : current - 1,
    );
  };

  const jumpToNextMatch = () => {
    if (matchedRowIndices.length === 0) {
      return;
    }

    setActiveMatchPosition((current) => (current + 1) % matchedRowIndices.length);
  };

  const setRowRef = useCallback((index: number, element: HTMLLIElement | null) => {
    if (element !== null) {
      rowRefsMap.current.set(index, element);
    } else {
      rowRefsMap.current.delete(index);
    }
  }, []);

  const renderConversationRow = (rowIndex: number) => {
    const row = renderableRows[rowIndex];
    if (row === undefined) {
      return null;
    }

    if (row.conversation.type === "x-error") {
      return (
        <div className="w-full flex justify-start">
          <SchemaErrorDisplay errorLine={row.conversation.line} />
        </div>
      );
    }

    const conversation = row.conversation;
    const isLocalCommandOutput =
      conversation.type === "user" &&
      typeof conversation.message.content === "string" &&
      parseUserMessage(conversation.message.content).kind === "local-command";

    const isSidechain =
      conversation.type !== "summary" &&
      conversation.type !== "file-history-snapshot" &&
      conversation.type !== "queue-operation" &&
      conversation.type !== "progress" &&
      conversation.type !== "custom-title" &&
      conversation.type !== "agent-name" &&
      conversation.type !== "pr-link" &&
      conversation.type !== "last-prompt" &&
      conversation.isSidechain;

    return (
      <div
        className={`w-full flex ${
          isSidechain ||
          isLocalCommandOutput ||
          conversation.type === "assistant" ||
          conversation.type === "system" ||
          conversation.type === "summary"
            ? "justify-start"
            : "justify-end"
        }`}
      >
        <div className="w-full max-w-3xl lg:max-w-4xl sm:w-[90%] md:w-[85%]">
          <ConversationItem
            conversation={conversation}
            getToolResult={getToolResult}
            getAgentIdForToolUse={getAgentIdForToolUse}
            getToolUseResult={getToolUseResult}
            getTurnDuration={getTurnDuration}
            isRootSidechain={isRootSidechain}
            getSidechainConversations={getSidechainConversations}
            getSidechainConversationByAgentId={getSidechainConversationByAgentId}
            getSidechainConversationByPrompt={getSidechainConversationByPrompt}
            existsRelatedTaskCall={existsRelatedTaskCall}
            projectId={projectId}
            sessionId={sessionId}
            showTimestamp={row.showTimestamp}
          />
        </div>
      </div>
    );
  };

  return (
    <>
      {enableInPageSearch && isSearchOpen && (
        <div className="sticky top-2 z-20 mb-3 flex justify-end">
          <div className="flex items-center gap-2 rounded-md border bg-background/95 px-2 py-1.5 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/85">
            <SearchIcon className="h-4 w-4 text-muted-foreground" />
            <Input
              id={searchInputId}
              placeholder="Find in conversation"
              defaultValue={committedSearchQuery}
              className="h-8 w-56"
              onKeyDown={(event) => {
                if (event.key !== "Enter") {
                  return;
                }

                const inputValue = event.currentTarget.value;
                const normalizedInputValue = inputValue.trim().toLowerCase();
                if (normalizedInputValue === committedSearchQuery && matchedRowIndices.length > 0) {
                  if (event.shiftKey) {
                    jumpToPreviousMatch();
                  } else {
                    jumpToNextMatch();
                  }
                  return;
                }

                commitSearch(inputValue);
              }}
            />
            <span className="min-w-14 text-right text-xs text-muted-foreground">
              {matchedRowIndices.length === 0
                ? "0/0"
                : `${activeMatchPosition + 1}/${matchedRowIndices.length}`}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => {
                const inputValue = getSearchInputElement()?.value ?? "";
                const normalizedInputValue = inputValue.trim().toLowerCase();
                if (normalizedInputValue !== committedSearchQuery) {
                  commitSearch(inputValue);
                  return;
                }
                jumpToPreviousMatch();
              }}
              disabled={matchedRowIndices.length === 0}
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => {
                const inputValue = getSearchInputElement()?.value ?? "";
                const normalizedInputValue = inputValue.trim().toLowerCase();
                if (normalizedInputValue !== committedSearchQuery) {
                  commitSearch(inputValue);
                  return;
                }
                jumpToNextMatch();
              }}
              disabled={matchedRowIndices.length === 0}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setIsSearchOpen(false)}
            >
              <XIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      <ul className="w-full">
        {renderableRows.map((row, index) => {
          const rowElement = renderConversationRow(index);
          if (rowElement === null) {
            return null;
          }

          return (
            <li key={row.rowKey} ref={(el) => setRowRef(index, el)}>
              {rowElement}
            </li>
          );
        })}
      </ul>
      <ScheduledMessageNotice scheduledJobs={scheduledJobs} />
    </>
  );
};
