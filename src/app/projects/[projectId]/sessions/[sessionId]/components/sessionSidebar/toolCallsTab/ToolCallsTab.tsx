import { useSearch } from "@tanstack/react-router";
import type { FC } from "react";
import { useMemo } from "react";
import { useSession } from "../../../hooks/useSession";
import {
  extractToolCalls,
  filterToolCalls,
} from "../../../utils/toolCallExtraction";
import { ToolCallFilters } from "./ToolCallFilters";
import { ToolCallList } from "./ToolCallList";

type ToolCallsTabProps = {
  projectId: string;
  sessionId: string;
  onNavigate?: (conversationIndex: number) => void;
};

export const ToolCallsTab: FC<ToolCallsTabProps> = ({
  projectId,
  sessionId,
  onNavigate,
}) => {
  const search = useSearch({
    from: "/projects/$projectId/session",
  });

  const { conversations, getToolResult } = useSession(projectId, sessionId);

  // Extract all tool calls from conversations
  const allToolCalls = useMemo(
    () => extractToolCalls(conversations, getToolResult),
    [conversations, getToolResult],
  );

  // Parse filter state from URL params
  const filters = useMemo(() => {
    const toolTypesSet = search.toolTypes
      ? new Set(search.toolTypes.split(",").filter(Boolean))
      : new Set<string>();

    return {
      toolTypes: toolTypesSet,
      pathQuery: search.pathQuery ?? "",
    };
  }, [search.toolTypes, search.pathQuery]);

  // Apply filters to tool calls
  const filteredToolCalls = useMemo(
    () => filterToolCalls(allToolCalls, filters),
    [allToolCalls, filters],
  );

  const handleNavigate = (conversationIndex: number) => {
    onNavigate?.(conversationIndex);
  };

  return (
    <div className="flex flex-col h-full">
      <ToolCallFilters
        projectId={projectId}
        sessionId={search.sessionId}
        currentTab={search.tab}
        toolTypes={search.toolTypes}
        pathQuery={search.pathQuery}
      />
      <div className="flex-1 overflow-y-auto">
        <ToolCallList
          toolCalls={filteredToolCalls}
          onNavigate={handleNavigate}
        />
      </div>
    </div>
  );
};
