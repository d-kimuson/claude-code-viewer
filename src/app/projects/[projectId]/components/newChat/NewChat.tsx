import type { FC } from "react";
import { useConfig } from "../../../../hooks/useConfig";
import { ChatInput, useNewChatMutation } from "../chatForm";

export const NewChat: FC<{
  projectId: string;
  onSuccess?: () => void;
}> = ({ projectId, onSuccess }) => {
  const startNewChat = useNewChatMutation(projectId, onSuccess);
  const { config } = useConfig();

  const handleSubmit = async (message: string) => {
    await startNewChat.mutateAsync({ message });
  };

  const getPlaceholder = () => {
    const isEnterSend = config?.enterKeyBehavior === "enter-send";
    if (isEnterSend) {
      return "Type your message here... (Start with / for commands, @ for files, Enter to send)";
    }
    return "Type your message here... (Start with / for commands, @ for files, Shift+Enter to send)";
  };

  return (
    <ChatInput
      projectId={projectId}
      onSubmit={handleSubmit}
      isPending={startNewChat.isPending}
      error={startNewChat.error}
      placeholder={getPlaceholder()}
      buttonText="Start Chat"
      minHeight="min-h-[200px]"
      containerClassName="space-y-4"
    />
  );
};
