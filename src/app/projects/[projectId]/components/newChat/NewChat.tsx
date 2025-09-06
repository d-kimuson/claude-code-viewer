import { useMutation } from "@tanstack/react-query";
import { AlertCircleIcon, LoaderIcon, SendIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FC, useId, useRef, useState } from "react";
import { Button } from "../../../../../components/ui/button";
import { Textarea } from "../../../../../components/ui/textarea";
import { honoClient } from "../../../../../lib/api/client";
import {
  CommandCompletion,
  type CommandCompletionRef,
} from "./CommandCompletion";
import { FileCompletion, type FileCompletionRef } from "./FileCompletion";

export const NewChat: FC<{
  projectId: string;
  onSuccess?: () => void;
}> = ({ projectId, onSuccess }) => {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const startNewChat = useMutation({
    mutationFn: async (options: { message: string }) => {
      const response = await honoClient.api.projects[":projectId"][
        "new-session"
      ].$post(
        {
          param: { projectId },
          json: { message: options.message },
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
      setMessage("");
      onSuccess?.();

      router.push(
        `/projects/${projectId}/sessions/${response.sessionId}#message-${response.userMessageId}`,
      );
    },
  });

  const [message, setMessage] = useState("");
  const completionRef = useRef<CommandCompletionRef>(null);
  const fileCompletionRef = useRef<FileCompletionRef>(null);
  const helpId = useId();

  const handleSubmit = () => {
    if (!message.trim()) return;
    startNewChat.mutate({ message: message.trim() });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // まずファイル補完のキーボードイベントを処理
    if (fileCompletionRef.current?.handleKeyDown(e)) {
      return;
    }

    // 次にコマンド補完のキーボードイベントを処理
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

  const handleFileSelect = (filePath: string) => {
    setMessage(filePath);
    textareaRef.current?.focus();
  };

  return (
    <div className="space-y-4">
      {startNewChat.error && (
        <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
          <AlertCircleIcon className="w-4 h-4" />
          <span>Failed to start new chat. Please try again.</span>
        </div>
      )}

      <div className="space-y-3">
        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message here... (Start with / for commands, @ for files, Shift+Enter to send)"
            className="min-h-[100px] resize-none"
            disabled={startNewChat.isPending}
            maxLength={4000}
            aria-label="Message input with command completion"
            aria-describedby={helpId}
            aria-expanded={message.startsWith("/") || message.includes("@")}
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
          <FileCompletion
            ref={fileCompletionRef}
            projectId={projectId}
            inputValue={message}
            onFileSelect={handleFileSelect}
            className="absolute top-full left-0 right-0"
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground" id={helpId}>
            {message.length}/4000 characters • Use arrow keys to navigate
            completions
          </span>

          <Button
            onClick={handleSubmit}
            disabled={!message.trim() || startNewChat.isPending}
            size="lg"
            className="gap-2"
          >
            {startNewChat.isPending ? (
              <>
                <LoaderIcon className="w-4 h-4 animate-spin" />
                Sending... This may take a while.
              </>
            ) : (
              <>
                <SendIcon className="w-4 h-4" />
                Start Chat
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
