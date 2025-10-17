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
    const behavior = config?.enterKeyBehavior;
    if (behavior === "enter-send") {
      return "Type your message... (Start with / for commands, @ for files, Enter to send)";
    }
    if (behavior === "command-enter-send") {
      return "Type your message... (Start with / for commands, @ for files, Command+Enter to send)";
    }
    return "Type your message... (Start with / for commands, @ for files, Shift+Enter to send)";
  };

  return (
    <div className="relative mt-8 mb-6">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-border to-transparent h-px top-0" />
      <div className="pt-8">
        <ChatInput
          projectId={projectId}
          onSubmit={handleSubmit}
          isPending={continueSessionProcess.isPending}
          error={continueSessionProcess.error}
          placeholder={getPlaceholder()}
          buttonText={"Send"}
          minHeight="min-h-[120px]"
          containerClassName=""
          buttonSize="lg"
        />
      </div>
    </div>
  );
};
