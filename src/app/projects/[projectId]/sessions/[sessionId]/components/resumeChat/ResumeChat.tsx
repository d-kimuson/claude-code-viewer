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
      return i18n._(
        "Type your message... (Start with / for commands, @ for files, Enter to send)",
      );
    }
    if (behavior === "command-enter-send") {
      return i18n._(
        "Type your message... (Start with / for commands, @ for files, Command+Enter to send)",
      );
    }
    return i18n._(
      "Type your message... (Start with / for commands, @ for files, Shift+Enter to send)",
    );
  };

  const buttonText = <Trans id="chat.resume" message="Resume" />;

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
          buttonText={buttonText}
          minHeight="min-h-[120px]"
          containerClassName=""
          buttonSize="lg"
        />
      </div>
    </div>
  );
};
