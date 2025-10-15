import type { FC } from "react";
import { useConfig } from "../../../../../../hooks/useConfig";
import {
  ChatInput,
  useContinueSessionProcessMutation,
} from "../../../../components/chatForm";

export const ContinueChat: FC<{
  projectId: string;
  sessionId: string;
  sessionProcessId: string;
}> = ({ projectId, sessionId, sessionProcessId }) => {
  const continueSessionProcess = useContinueSessionProcessMutation(
    projectId,
    sessionId,
  );
  const { config } = useConfig();

  const handleSubmit = async (message: string) => {
    await continueSessionProcess.mutateAsync({ message, sessionProcessId });
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
        isPending={continueSessionProcess.isPending}
        error={continueSessionProcess.error}
        placeholder={getPlaceholder()}
        buttonText={"Send"}
        minHeight="min-h-[100px]"
        containerClassName="space-y-2"
        buttonSize="default"
      />
    </div>
  );
};
