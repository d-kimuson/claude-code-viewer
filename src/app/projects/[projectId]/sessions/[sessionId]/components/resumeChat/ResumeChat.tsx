import { useMutation } from "@tanstack/react-query";
import { AlertCircleIcon, LoaderIcon, SendIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FC, useId, useRef, useState } from "react";

import { Button } from "../../../../../../../components/ui/button";
import { Textarea } from "../../../../../../../components/ui/textarea";
import { honoClient } from "../../../../../../../lib/api/client";
import {
  CommandCompletion,
  type CommandCompletionRef,
} from "../../../../components/newChat/CommandCompletion";

export const ResumeChat: FC<{
  projectId: string;
  sessionId: string;
  isPausedTask: boolean;
  isRunningTask: boolean;
}> = ({ projectId, sessionId, isPausedTask, isRunningTask }) => {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resumeChat = useMutation({
    mutationFn: async (options: { message: string }) => {
      const response = await honoClient.api.projects[":projectId"].sessions[
        ":sessionId"
      ].resume.$post(
        {
          param: { projectId, sessionId },
          json: { resumeMessage: options.message },
        },
        {
          init: {
            signal: AbortSignal.timeout(10 * 1000),
          },
        },
      );

      if (!response.ok) {
        throw new Error(response.statusText);
      }

      return response.json();
    },
    onSuccess: async (response) => {
      if (sessionId !== response.sessionId) {
        router.push(
          `/projects/${projectId}/sessions/${response.sessionId}#message-${response.userMessageId}`,
        );
      }

      setMessage("");
    },
  });

  const [message, setMessage] = useState("");
  const completionRef = useRef<CommandCompletionRef>(null);
  const helpId = useId();

  const handleSubmit = () => {
    if (!message.trim()) return;
    resumeChat.mutate({ message: message.trim() });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // まずコマンド補完のキーボードイベントを処理
    if (completionRef.current?.handleKeyDown(e)) {
      return;
    }

    // 通常のキーボードイベント処理
    if (e.key === "Enter" && e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleCommandSelect = (command: string) => {
    setMessage(command);
    textareaRef.current?.focus();
  };

  return (
    <div className="border-t border-border/50 bg-muted/20 p-4 mt-6">
      {resumeChat.error && (
        <div className="flex items-center gap-2 p-3 mb-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
          <AlertCircleIcon className="w-4 h-4" />
          <span>Failed to resume chat. Please try again.</span>
        </div>
      )}

      <div className="space-y-2">
        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message... (Start with / for commands, Shift+Enter to send)"
            className="min-h-[60px] resize-none"
            disabled={resumeChat.isPending}
            maxLength={4000}
            aria-label="Message input with command completion"
            aria-describedby={helpId}
            aria-expanded={message.startsWith("/")}
            aria-haspopup="listbox"
            role="combobox"
            aria-autocomplete="list"
          />
          <CommandCompletion
            ref={completionRef}
            projectId={projectId}
            inputValue={message}
            onCommandSelect={handleCommandSelect}
            className="absolute top-full left-0 right-0"
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground" id={helpId}>
            {message.length}/4000
          </span>

          <Button
            onClick={handleSubmit}
            disabled={!message.trim() || resumeChat.isPending}
            size="default"
            className="gap-2"
          >
            {resumeChat.isPending ? (
              <>
                <LoaderIcon className="w-4 h-4 animate-spin" />
                Sending... This may take a while.
              </>
            ) : isPausedTask || isRunningTask ? (
              <>
                <SendIcon className="w-4 h-4" />
                Send
              </>
            ) : (
              <>
                <SendIcon className="w-4 h-4" />
                Resume
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
