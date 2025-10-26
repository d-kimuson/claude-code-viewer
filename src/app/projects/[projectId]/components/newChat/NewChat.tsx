import { Trans, useLingui } from "@lingui/react";
import type { FC } from "react";
import { useConfig } from "../../../../hooks/useConfig";
import {
  ChatInput,
  type MessageInput,
  useCreateSessionProcessMutation,
} from "../chatForm";

export const NewChat: FC<{
  projectId: string;
  onSuccess?: () => void;
}> = ({ projectId, onSuccess }) => {
  const { i18n } = useLingui();
  const createSessionProcess = useCreateSessionProcessMutation(
    projectId,
    onSuccess,
  );
  const { config } = useConfig();

  const handleSubmit = async (input: MessageInput) => {
    await createSessionProcess.mutateAsync({ input });
  };

  const getPlaceholder = () => {
    const behavior = config?.enterKeyBehavior;
    if (behavior === "enter-send") {
      return i18n._(
        "Type your message here... (Start with / for commands, @ for files, Enter to send)",
      );
    }
    if (behavior === "command-enter-send") {
      return i18n._(
        "Type your message here... (Start with / for commands, @ for files, Command+Enter to send)",
      );
    }
    return i18n._(
      "Type your message here... (Start with / for commands, @ for files, Shift+Enter to send)",
    );
  };

  return (
    <ChatInput
      projectId={projectId}
      onSubmit={handleSubmit}
      isPending={createSessionProcess.isPending}
      error={createSessionProcess.error}
      placeholder={getPlaceholder()}
      buttonText={<Trans id="chat.button.start" message="Start Chat" />}
      minHeight="min-h-[200px]"
      containerClassName="px-0 py-6"
      buttonSize="lg"
    />
  );
};
