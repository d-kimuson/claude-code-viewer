import { Trans, useLingui } from "@lingui/react";
import type { FC } from "react";
import { useConfig } from "../../../../../../hooks/useConfig";
import {
  ChatInput,
  type MessageInput,
  useContinueSessionProcessMutation,
  useEnqueueMessageMutation,
} from "../../../../components/chatForm";

export const ContinueChat: FC<{
  projectId: string;
  sessionId: string;
  sessionProcessId: string;
  sessionProcessStatus?: "running" | "paused";
}> = ({ projectId, sessionId, sessionProcessId, sessionProcessStatus }) => {
  const { i18n } = useLingui();
  const continueSessionProcess = useContinueSessionProcessMutation(projectId, sessionId);
  const enqueueMessage = useEnqueueMessageMutation(projectId, sessionId);
  const { config } = useConfig();

  const isRunning = sessionProcessStatus === "running";

  const handleSubmit = async (input: MessageInput) => {
    if (isRunning) {
      await enqueueMessage.mutateAsync({ input, sessionProcessId });
    } else {
      await continueSessionProcess.mutateAsync({ input, sessionProcessId });
    }
  };

  const isPending = continueSessionProcess.isPending || enqueueMessage.isPending;
  const error = continueSessionProcess.error ?? enqueueMessage.error;

  const getPlaceholder = () => {
    const behavior = config?.enterKeyBehavior;
    if (behavior === "enter-send") {
      return i18n._({
        id: "chat.placeholder.continue.enter",
        message: "Type your message... (Start with / for commands, @ for files, Enter to send)",
      });
    }
    if (behavior === "command-enter-send") {
      return i18n._({
        id: "chat.placeholder.continue.command_enter",
        message:
          "Type your message... (Start with / for commands, @ for files, Command+Enter to send)",
      });
    }
    return i18n._({
      id: "chat.placeholder.continue.shift_enter",
      message: "Type your message... (Start with / for commands, @ for files, Shift+Enter to send)",
    });
  };

  const getRunningPlaceholder = () => {
    const behavior = config?.enterKeyBehavior;
    if (behavior === "enter-send") {
      return i18n._({
        id: "chat.placeholder.running.enter",
        message: "Claude is running… type your next message and send when ready (Enter to send)",
      });
    }
    if (behavior === "command-enter-send") {
      return i18n._({
        id: "chat.placeholder.running.command_enter",
        message:
          "Claude is running… type your next message and send when ready (Command+Enter to send)",
      });
    }
    return i18n._({
      id: "chat.placeholder.running.shift_enter",
      message:
        "Claude is running… type your next message and send when ready (Shift+Enter to send)",
    });
  };

  return (
    <div className="w-full px-4 pb-3">
      <ChatInput
        projectId={projectId}
        onSubmit={handleSubmit}
        isPending={isPending}
        error={error}
        placeholder={isRunning ? getRunningPlaceholder() : getPlaceholder()}
        buttonText={<Trans id="chat.send" />}
        containerClassName=""
        buttonSize="default"
        enableScheduledSend={!isRunning}
        baseSessionId={sessionId}
      />
    </div>
  );
};
