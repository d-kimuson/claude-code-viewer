import { Trans } from "@lingui/react";
import { Eye } from "lucide-react";
import type { FC } from "react";
import { Button } from "@/components/ui/button";
import type { SidechainConversation } from "@/lib/conversation-schema";
import type { ToolResultContent } from "@/lib/conversation-schema/content/ToolResultContentSchema";
import { SidechainConversationModal } from "../conversationModal/SidechainConversationModal";

type LegacyTaskModalProps = {
  prompt: string;
  getSidechainConversationByPrompt: (
    prompt: string,
  ) => SidechainConversation | undefined;
  getSidechainConversations: (rootUuid: string) => SidechainConversation[];
  getToolResult: (toolUseId: string) => ToolResultContent | undefined;
  projectId: string;
  sessionId: string;
};

/**
 * Legacy task modal component for Claude Code versions before v2.0.28.
 * Displays task details from embedded sidechain conversations within the same session file.
 * Only shows the button when matching sidechain data exists in the current session.
 */
export const LegacyTaskModal: FC<LegacyTaskModalProps> = ({
  prompt,
  getSidechainConversationByPrompt,
  getSidechainConversations,
  getToolResult,
  projectId,
  sessionId,
}) => {
  const conversation = getSidechainConversationByPrompt(prompt);

  if (conversation === undefined) {
    return null;
  }

  return (
    <SidechainConversationModal
      conversation={conversation}
      sidechainConversations={getSidechainConversations(conversation.uuid).map(
        (original) => ({
          ...original,
          isSidechain: false,
        }),
      )}
      getToolResult={getToolResult}
      projectId={projectId}
      sessionId={sessionId}
      trigger={
        <Button
          variant="ghost"
          size="sm"
          className="h-auto py-1.5 px-3 text-xs hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-none flex items-center gap-1"
          data-testid="sidechain-task-button"
        >
          <Eye className="h-3 w-3" />
          <Trans id="assistant.tool.view_task_details" />
        </Button>
      }
    />
  );
};
