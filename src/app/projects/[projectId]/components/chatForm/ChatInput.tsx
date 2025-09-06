import { AlertCircleIcon, LoaderIcon, SendIcon } from "lucide-react";
import { type FC, useCallback, useId, useRef, useState } from "react";
import { Button } from "../../../../../components/ui/button";
import { Textarea } from "../../../../../components/ui/textarea";
import type { CommandCompletionRef } from "./CommandCompletion";
import type { FileCompletionRef } from "./FileCompletion";
import { InlineCompletion } from "./InlineCompletion";

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
  const [message, setMessage] = useState("");
  const [cursorPosition, setCursorPosition] = useState<{
    relative: { top: number; left: number };
    absolute: { top: number; left: number };
  }>({ relative: { top: 0, left: 0 }, absolute: { top: 0, left: 0 } });

  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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

  const getCursorPosition = useCallback(() => {
    const textarea = textareaRef.current;
    const container = containerRef.current;
    if (textarea === null || container === null) return undefined;

    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = textarea.value.substring(0, cursorPos);
    const textAfterCursor = textarea.value.substring(cursorPos);

    const pre = document.createTextNode(textBeforeCursor);
    const post = document.createTextNode(textAfterCursor);
    const caret = document.createElement("span");
    caret.innerHTML = "&nbsp;";

    const mirrored = document.createElement("div");

    mirrored.innerHTML = "";
    mirrored.append(pre, caret, post);

    const textareaStyles = window.getComputedStyle(textarea);
    for (const property of [
      "border",
      "boxSizing",
      "fontFamily",
      "fontSize",
      "fontWeight",
      "letterSpacing",
      "lineHeight",
      "padding",
      "textDecoration",
      "textIndent",
      "textTransform",
      "whiteSpace",
      "wordSpacing",
      "wordWrap",
    ] as const) {
      mirrored.style[property] = textareaStyles[property];
    }

    mirrored.style.visibility = "hidden";
    container.prepend(mirrored);

    const caretRect = caret.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    container.removeChild(mirrored);

    return {
      relative: {
        top: caretRect.top - containerRect.top - textarea.scrollTop,
        left: caretRect.left - containerRect.left - textarea.scrollLeft,
      },
      absolute: {
        top: caretRect.top - textarea.scrollTop,
        left: caretRect.left - textarea.scrollLeft,
      },
    };
  }, []);

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
        <div className="relative" ref={containerRef}>
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => {
              if (
                e.target.value.endsWith("@") ||
                e.target.value.endsWith("/")
              ) {
                const position = getCursorPosition();
                if (position) {
                  setCursorPosition(position);
                }
              }

              setMessage(e.target.value);
            }}
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
          <InlineCompletion
            projectId={projectId}
            message={message}
            commandCompletionRef={commandCompletionRef}
            fileCompletionRef={fileCompletionRef}
            handleCommandSelect={handleCommandSelect}
            handleFileSelect={handleFileSelect}
            cursorPosition={cursorPosition}
          />
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
