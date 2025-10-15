import type { FC } from "react";
import { useConfig } from "../../../../../../hooks/useConfig";
import {
  ChatInput,
  useCreateSessionProcessMutation,
} from "../../../../components/chatForm";

export const ResumeChat: FC<{
  projectId: string;
  sessionId: string;
}> = ({ projectId, sessionId }) => {
  const createSessionProcess = useCreateSessionProcessMutation(projectId);
  const { config } = useConfig();

  const handleSubmit = async (message: string) => {
    await createSessionProcess.mutateAsync({
      message,
      baseSessionId: sessionId,
    });
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
        isPending={createSessionProcess.isPending}
        error={createSessionProcess.error}
        placeholder={getPlaceholder()}
        buttonText={"Resume"}
        minHeight="min-h-[100px]"
        containerClassName="space-y-2"
        buttonSize="default"
      />
    </div>
  );
};
