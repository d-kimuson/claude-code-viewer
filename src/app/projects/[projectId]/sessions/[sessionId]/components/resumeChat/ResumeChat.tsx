import type { FC } from "react";
import { useConfig } from "../../../../../../hooks/useConfig";
import {
  ChatInput,
  useResumeChatMutation,
} from "../../../../components/chatForm";

export const ResumeChat: FC<{
  projectId: string;
  sessionId: string;
  isPausedTask: boolean;
  isRunningTask: boolean;
}> = ({ projectId, sessionId, isPausedTask, isRunningTask }) => {
  const resumeChat = useResumeChatMutation(projectId, sessionId);
  const { config } = useConfig();

  const handleSubmit = async (message: string) => {
    await resumeChat.mutateAsync({ message });
  };

  const getButtonText = () => {
    if (isPausedTask || isRunningTask) {
      return "Send";
    }
    return "Resume";
  };

  const getPlaceholder = () => {
    const isEnterSend = config?.enterKeyBehavior === "enter-send";
    if (isEnterSend) {
      return "Type your message... (Start with / for commands, Enter to send)";
    }
    return "Type your message... (Start with / for commands, Shift+Enter to send)";
  };

  return (
    <div className="border-t border-border/50 bg-muted/20 p-4 mt-6">
      <ChatInput
        projectId={projectId}
        onSubmit={handleSubmit}
        isPending={resumeChat.isPending}
        error={resumeChat.error}
        placeholder={getPlaceholder()}
        buttonText={getButtonText()}
        minHeight="min-h-[100px]"
        containerClassName="space-y-2"
        buttonSize="default"
      />
    </div>
  );
};
