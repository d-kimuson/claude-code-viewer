import { Trans, useLingui } from "@lingui/react";
import type { FC } from "react";
import { useConfig } from "../../../../../../hooks/useConfig";
import {
  ChatInput,
  type MessageInput,
  useCreateSessionProcessMutation,
} from "../../../../components/chatForm";

export const ResumeChat: FC<{
  projectId: string;
  sessionId: string;
}> = ({ projectId, sessionId }) => {
  const { i18n } = useLingui();
  const createSessionProcess = useCreateSessionProcessMutation(projectId);
  const { config } = useConfig();

  const handleSubmit = async (input: MessageInput) => {
    await createSessionProcess.mutateAsync({
      input,
      baseSessionId: sessionId,
    });
  };

  const getPlaceholder = () => {
    const behavior = config?.enterKeyBehavior;
    if (behavior === "enter-send") {
      return i18n._({
        id: "chat.placeholder.resume.enter",
        message:
          "Type your message... (Start with / for commands, @ for files, Enter to send)",
      });
    }
    if (behavior === "command-enter-send") {
      return i18n._({
        id: "chat.placeholder.resume.command_enter",
        message:
          "Type your message... (Start with / for commands, @ for files, Command+Enter to send)",
      });
    }
    return i18n._({
      id: "chat.placeholder.resume.shift_enter",
      message:
        "Type your message... (Start with / for commands, @ for files, Shift+Enter to send)",
    });
  };

  const buttonText = <Trans id="chat.resume" />;

  return (
    <div className="w-full px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 pb-3">
      <ChatInput
        projectId={projectId}
        onSubmit={handleSubmit}
        isPending={createSessionProcess.isPending}
        error={createSessionProcess.error}
        placeholder={getPlaceholder()}
        buttonText={buttonText}
        containerClassName=""
        buttonSize="default"
        enableScheduledSend={true}
        baseSessionId={sessionId}
        enableCCOptions={true}
      />
    </div>
  );
};
