import type { FC } from "react";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import type { SidechainConversation } from "@/lib/conversation-schema";
import type { ToolResultContent } from "@/lib/conversation-schema/content/ToolResultContentSchema";
import { AgentSessionTaskModal } from "./AgentSessionTaskModal";
import { LegacyTaskModal } from "./LegacyTaskModal";

type TaskModalContainerProps = {
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
 * Version-aware router component for Task tool modals.
 * Routes to the appropriate implementation based on the `sidechain-separation` feature flag:
 * - Flag enabled (v2.0.28+): Uses AgentSessionTaskModal (fetches from separate agent-*.jsonl files)
 * - Flag disabled (older versions): Uses LegacyTaskModal (reads from embedded sidechain data)
 */
export const TaskModalContainer: FC<TaskModalContainerProps> = ({
  prompt,
  projectId,
  sessionId,
  getSidechainConversationByPrompt,
  getSidechainConversations,
  getToolResult,
}) => {
  const { isFlagEnabled } = useFeatureFlags();
  const hasSidechainSeparation = isFlagEnabled("sidechain-separation");

  if (hasSidechainSeparation) {
    return (
      <AgentSessionTaskModal
        prompt={prompt}
        projectId={projectId}
        sessionId={sessionId}
        getToolResult={getToolResult}
      />
    );
  }

  return (
    <LegacyTaskModal
      prompt={prompt}
      getSidechainConversationByPrompt={getSidechainConversationByPrompt}
      getSidechainConversations={getSidechainConversations}
      getToolResult={getToolResult}
      projectId={projectId}
      sessionId={sessionId}
    />
  );
};
