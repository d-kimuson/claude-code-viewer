import { Trans, useLingui } from "@lingui/react";
import {
  AlertCircleIcon,
  LoaderIcon,
  PaperclipIcon,
  SendIcon,
  SparklesIcon,
  XIcon,
} from "lucide-react";
import { type FC, useCallback, useId, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "../../../../../components/ui/button";
import { Input } from "../../../../../components/ui/input";
import { Label } from "../../../../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../../components/ui/select";
import { Textarea } from "../../../../../components/ui/textarea";
import { useCreateSchedulerJob } from "../../../../../hooks/useScheduler";
import type {
  DocumentBlockParam,
  ImageBlockParam,
} from "../../../../../server/core/claude-code/schema";
import { useConfig } from "../../../../hooks/useConfig";
import type { CommandCompletionRef } from "./CommandCompletion";
import type { FileCompletionRef } from "./FileCompletion";
import { processFile } from "./fileUtils";
import { InlineCompletion } from "./InlineCompletion";

export interface MessageInput {
  text: string;
  images?: ImageBlockParam[];
  documents?: DocumentBlockParam[];
}

export interface ChatInputProps {
  projectId: string;
  onSubmit: (input: MessageInput) => Promise<void>;
  isPending: boolean;
  error?: Error | null;
  placeholder: string;
  buttonText: React.ReactNode;
  minHeight?: string;
  containerClassName?: string;
  disabled?: boolean;
  buttonSize?: "sm" | "default" | "lg";
  enableScheduledSend?: boolean;
  baseSessionId?: string | null;
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
  enableScheduledSend = false,
  baseSessionId = null,
}) => {
  const { i18n } = useLingui();
  const [message, setMessage] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<
    Array<{ file: File; id: string }>
  >([]);
  const [cursorPosition, setCursorPosition] = useState<{
    relative: { top: number; left: number };
    absolute: { top: number; left: number };
  }>({ relative: { top: 0, left: 0 }, absolute: { top: 0, left: 0 } });
  const [sendMode, setSendMode] = useState<"immediate" | "scheduled">(
    "immediate",
  );
  const [scheduledTime, setScheduledTime] = useState(() => {
    const now = new Date();
    now.setHours(now.getHours() + 1);
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const commandCompletionRef = useRef<CommandCompletionRef>(null);
  const fileCompletionRef = useRef<FileCompletionRef>(null);
  const helpId = useId();
  const { config } = useConfig();
  const createSchedulerJob = useCreateSchedulerJob();

  const handleSubmit = async () => {
    if (!message.trim() && attachedFiles.length === 0) return;

    const images: ImageBlockParam[] = [];
    const documents: DocumentBlockParam[] = [];

    for (const { file } of attachedFiles) {
      const result = await processFile(file);

      if (result === null) {
        continue;
      }

      if (result.type === "text") {
        documents.push({
          type: "document",
          source: {
            type: "text",
            media_type: "text/plain",
            data: result.content,
          },
        });
      } else if (result.type === "image") {
        images.push(result.block);
      } else if (result.type === "document") {
        documents.push(result.block);
      }
    }

    if (enableScheduledSend && sendMode === "scheduled") {
      // Create a scheduler job for scheduled send
      const match = scheduledTime.match(
        /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/,
      );
      if (!match) {
        throw new Error("Invalid datetime format");
      }
      const year = Number(match[1]);
      const month = Number(match[2]);
      const day = Number(match[3]);
      const hours = Number(match[4]);
      const minutes = Number(match[5]);
      const localDate = new Date(year, month - 1, day, hours, minutes);

      try {
        await createSchedulerJob.mutateAsync({
          name: `Scheduled message at ${scheduledTime}`,
          schedule: {
            type: "reserved",
            reservedExecutionTime: localDate.toISOString(),
          },
          message: {
            content: message,
            projectId,
            baseSessionId,
          },
          enabled: true,
        });

        toast.success(
          i18n._({
            id: "chat.scheduled_send.success",
            message: "Message scheduled successfully",
          }),
          {
            description: i18n._({
              id: "chat.scheduled_send.success_description",
              message: "You can view and manage it in the Scheduler tab",
            }),
          },
        );

        setMessage("");
        setAttachedFiles([]);
      } catch (error) {
        toast.error(
          i18n._({
            id: "chat.scheduled_send.failed",
            message: "Failed to schedule message",
          }),
          {
            description: error instanceof Error ? error.message : undefined,
          },
        );
      }
    } else {
      // Immediate send
      await onSubmit({
        text: message,
        images: images.length > 0 ? images : undefined,
        documents: documents.length > 0 ? documents : undefined,
      });

      setMessage("");
      setAttachedFiles([]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles = Array.from(files).map((file) => ({
      file,
      id: `${file.name}-${Date.now()}-${Math.random()}`,
    }));

    setAttachedFiles((prev) => [...prev, ...newFiles]);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveFile = (id: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (fileCompletionRef.current?.handleKeyDown(e)) {
      return;
    }

    if (commandCompletionRef.current?.handleKeyDown(e)) {
      return;
    }

    // IMEで変換中の場合は送信しない
    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
      const enterKeyBehavior = config?.enterKeyBehavior;

      if (enterKeyBehavior === "enter-send" && !e.shiftKey && !e.metaKey) {
        // Enter: Send mode
        e.preventDefault();
        handleSubmit();
      } else if (
        enterKeyBehavior === "shift-enter-send" &&
        e.shiftKey &&
        !e.metaKey
      ) {
        // Shift+Enter: Send mode (default)
        e.preventDefault();
        handleSubmit();
      } else if (
        enterKeyBehavior === "command-enter-send" &&
        e.metaKey &&
        !e.shiftKey
      ) {
        // Command+Enter: Send mode (Mac)
        e.preventDefault();
        handleSubmit();
      }
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

  const handleFilePathSelect = (filePath: string) => {
    setMessage(filePath);
    textareaRef.current?.focus();
  };

  return (
    <div className={containerClassName}>
      {error && (
        <div className="flex items-center gap-2.5 px-4 py-3 text-sm text-red-600 dark:text-red-400 bg-gradient-to-r from-red-50 to-red-100/50 dark:from-red-950/30 dark:to-red-900/20 border border-red-200/50 dark:border-red-800/50 rounded-xl mb-4 animate-in fade-in slide-in-from-top-2 duration-300 shadow-sm">
          <AlertCircleIcon className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="font-medium">
            <Trans
              id="chat.error.send_failed"
              message="Failed to send message. Please try again."
            />
          </span>
        </div>
      )}

      <div className="relative group">
        <div
          className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          aria-hidden="true"
        />

        <div className="relative bg-background border border-border/40 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
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
              className={`${minHeight} resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent px-5 py-4 text-lg transition-all duration-200 placeholder:text-muted-foreground/60`}
              disabled={isPending || disabled}
              maxLength={4000}
              aria-label={i18n._("Message input with completion support")}
              aria-describedby={helpId}
              aria-expanded={message.startsWith("/") || message.includes("@")}
              aria-haspopup="listbox"
              role="combobox"
              aria-autocomplete="list"
            />
          </div>

          {attachedFiles.length > 0 && (
            <div className="px-5 py-3 flex flex-wrap gap-2 border-t border-border/40">
              {attachedFiles.map(({ file, id }) => (
                <div
                  key={id}
                  className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg text-sm"
                >
                  <span className="truncate max-w-[200px]">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(id)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    disabled={isPending}
                  >
                    <XIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between gap-3 px-5 py-3 bg-muted/30 border-t border-border/40">
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isPending || disabled}
                className="gap-1.5"
              >
                <PaperclipIcon className="w-4 h-4" />
                <span className="text-xs">
                  <Trans id="chat.attach_file" message="Attach" />
                </span>
              </Button>
              <span
                className="text-xs font-medium text-muted-foreground/80"
                id={helpId}
              >
                {message.length}
                <span className="text-muted-foreground/50">/4000</span>
              </span>
              {(message.startsWith("/") || message.includes("@")) && (
                <span className="text-xs text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1">
                  <SparklesIcon className="w-3 h-3" />
                  <Trans
                    id="chat.autocomplete.active"
                    message="Autocomplete active"
                  />
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {enableScheduledSend && (
                <div className="flex items-center gap-2">
                  <Label htmlFor="send-mode" className="text-xs sr-only">
                    <Trans id="chat.send_mode.label" message="Send mode" />
                  </Label>
                  <Select
                    value={sendMode}
                    onValueChange={(value: "immediate" | "scheduled") =>
                      setSendMode(value)
                    }
                    disabled={isPending || disabled}
                  >
                    <SelectTrigger
                      id="send-mode"
                      className="h-8 w-[140px] text-xs"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediate">
                        <Trans
                          id="chat.send_mode.immediate"
                          message="Send now"
                        />
                      </SelectItem>
                      <SelectItem value="scheduled">
                        <Trans
                          id="chat.send_mode.scheduled"
                          message="Schedule send"
                        />
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  {sendMode === "scheduled" && (
                    <div className="flex items-center gap-1.5">
                      <Label
                        htmlFor="scheduled-time"
                        className="text-xs sr-only"
                      >
                        <Trans
                          id="chat.send_mode.scheduled_time"
                          message="Scheduled time"
                        />
                      </Label>
                      <Input
                        id="scheduled-time"
                        type="datetime-local"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        disabled={isPending || disabled}
                        className="h-8 w-[180px] text-xs"
                      />
                    </div>
                  )}
                </div>
              )}

              <Button
                onClick={handleSubmit}
                disabled={
                  (!message.trim() && attachedFiles.length === 0) ||
                  isPending ||
                  disabled
                }
                size={buttonSize}
                className="gap-2 transition-all duration-200 hover:shadow-md hover:scale-105 active:scale-95 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:from-muted disabled:to-muted"
              >
                {isPending ? (
                  <>
                    <LoaderIcon className="w-4 h-4 animate-spin" />
                    <span>
                      <Trans
                        id="chat.status.processing"
                        message="Processing..."
                      />
                    </span>
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
        <InlineCompletion
          projectId={projectId}
          message={message}
          commandCompletionRef={commandCompletionRef}
          fileCompletionRef={fileCompletionRef}
          handleCommandSelect={handleCommandSelect}
          handleFileSelect={handleFilePathSelect}
          cursorPosition={cursorPosition}
        />
      </div>
    </div>
  );
};
