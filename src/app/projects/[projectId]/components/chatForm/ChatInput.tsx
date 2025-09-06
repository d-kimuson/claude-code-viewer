import { AlertCircleIcon, LoaderIcon, SendIcon } from "lucide-react";
import { type FC, useId, useRef, useState } from "react";
import { Button } from "../../../../../components/ui/button";
import { Textarea } from "../../../../../components/ui/textarea";
import {
  CommandCompletion,
  type CommandCompletionRef,
} from "./CommandCompletion";
import { FileCompletion, type FileCompletionRef } from "./FileCompletion";

export interface ChatInputProps {
  projectId: string;
  onSubmit: (message: string) => void;
  isPending: boolean;
  error?: Error | null;
  placeholder: string;
  buttonText: string;
  minHeight?: string;
  containerClassName?: string;
  disabled?: boolean;
  buttonSize?: "sm" | "default" | "lg";
}

export const ChatInput: FC<ChatInputProps> = ({
  projectId,
  onSubmit,
  isPending,
  error,
  placeholder,
  buttonText,
  minHeight = "min-h-[100px]",
  containerClassName = "",
  disabled = false,
  buttonSize = "lg",
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [message, setMessage] = useState("");
  const commandCompletionRef = useRef<CommandCompletionRef>(null);
  const fileCompletionRef = useRef<FileCompletionRef>(null);
  const helpId = useId();

  const handleSubmit = () => {
    if (!message.trim()) return;
    onSubmit(message.trim());
    setMessage("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (fileCompletionRef.current?.handleKeyDown(e)) {
      return;
    }

    if (commandCompletionRef.current?.handleKeyDown(e)) {
      return;
    }

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
    <div className={containerClassName}>
      {error && (
        <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md mb-4">
          <AlertCircleIcon className="w-4 h-4" />
          <span>Failed to send message. Please try again.</span>
        </div>
      )}

      <div className="space-y-3">
        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={`${minHeight} resize-none`}
            disabled={isPending || disabled}
            maxLength={4000}
            aria-label="Message input with completion support"
            aria-describedby={helpId}
            aria-expanded={message.startsWith("/") || message.includes("@")}
            aria-haspopup="listbox"
            role="combobox"
            aria-autocomplete="list"
          />
          <CommandCompletion
            ref={commandCompletionRef}
            projectId={projectId}
            inputValue={message}
            onCommandSelect={handleCommandSelect}
            className="absolute top-full left-0 right-0"
          />
          {
            <FileCompletion
              ref={fileCompletionRef}
              projectId={projectId}
              inputValue={message}
              onFileSelect={handleFileSelect}
              className="absolute top-full left-0 right-0"
            />
          }
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground" id={helpId}>
            {message.length}/4000 characters " • Use arrow keys to navigate
            completions"
          </span>

          <Button
            onClick={handleSubmit}
            disabled={!message.trim() || isPending || disabled}
            size={buttonSize}
            className="gap-2"
          >
            {isPending ? (
              <>
                <LoaderIcon className="w-4 h-4 animate-spin" />
                Sending... This may take a while.
              </>
            ) : (
              <>
                <SendIcon className="w-4 h-4" />
                {buttonText}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
