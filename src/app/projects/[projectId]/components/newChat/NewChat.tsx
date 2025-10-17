import type { FC } from "react";
import { useConfig } from "../../../../hooks/useConfig";
import { ChatInput, useCreateSessionProcessMutation } from "../chatForm";

export const NewChat: FC<{
  projectId: string;
  onSuccess?: () => void;
}> = ({ projectId, onSuccess }) => {
  const createSessionProcess = useCreateSessionProcessMutation(
    projectId,
    onSuccess,
  );
  const { config } = useConfig();

  const handleSubmit = async (message: string) => {
    await createSessionProcess.mutateAsync({ message });
  };

  const getPlaceholder = () => {
    const behavior = config?.enterKeyBehavior;
    if (behavior === "enter-send") {
      return "Type your message here... (Start with / for commands, @ for files, Enter to send)";
    }
    if (behavior === "command-enter-send") {
      return "Type your message here... (Start with / for commands, @ for files, Command+Enter to send)";
    }
    return "Type your message here... (Start with / for commands, @ for files, Shift+Enter to send)";
  };

  return (
    <ChatInput
      projectId={projectId}
      onSubmit={handleSubmit}
      isPending={createSessionProcess.isPending}
      error={createSessionProcess.error}
      placeholder={getPlaceholder()}
      buttonText="Start Chat"
      minHeight="min-h-[200px]"
      containerClassName="p-6"
      buttonSize="lg"
    />
  );
};
