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
          isPending={createSessionProcess.isPending}
          error={createSessionProcess.error}
          placeholder={getPlaceholder()}
          buttonText={"Resume"}
          minHeight="min-h-[120px]"
          containerClassName=""
          buttonSize="default"
        />
      </div>
    </div>
  );
};
