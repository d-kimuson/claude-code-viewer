import type { FC } from "react";
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

  const handleSubmit = (message: string) => {
    resumeChat.mutate({ message });
  };

  const getButtonText = () => {
    if (isPausedTask || isRunningTask) {
      return "Send";
    }
    return "Resume";
  };

  return (
    <div className="border-t border-border/50 bg-muted/20 p-4 mt-6">
      <ChatInput
        projectId={projectId}
        onSubmit={handleSubmit}
        isPending={resumeChat.isPending}
        error={resumeChat.error}
        placeholder="Type your message... (Start with / for commands, Shift+Enter to send)"
        buttonText={getButtonText()}
        minHeight="min-h-[100px]"
        containerClassName="space-y-2"
        buttonSize="default"
      />
    </div>
  );
};
