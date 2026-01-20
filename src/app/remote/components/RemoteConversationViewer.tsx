import type { FC } from "react";
import { ConversationList } from "@/app/projects/[projectId]/sessions/[sessionId]/components/conversationList/ConversationList";
import type { Conversation } from "@/lib/conversation-schema";
import type { ToolResultContent } from "@/lib/conversation-schema/content/ToolResultContentSchema";
import type { ErrorJsonl } from "@/server/core/types";

type RemoteConversationViewerProps = {
  conversations: (Conversation | ErrorJsonl)[];
  getToolResult: (toolUseId: string) => ToolResultContent | undefined;
};

export const RemoteConversationViewer: FC<RemoteConversationViewerProps> = ({
  conversations,
  getToolResult,
}) => {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <ConversationList
        conversations={conversations}
        getToolResult={getToolResult}
        projectId="remote"
        sessionId="remote"
        scheduledJobs={[]}
      />
    </div>
  );
};
