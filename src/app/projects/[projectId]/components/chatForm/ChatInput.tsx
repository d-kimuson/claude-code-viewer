import { Trans, useLingui } from "@lingui/react";
import {
  AlertCircleIcon,
  LoaderIcon,
  PaperclipIcon,
  SendIcon,
  XIcon,
} from "lucide-react";
import {
  type FC,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
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
  CCOptionsSchema,
  DocumentBlockParam,
  ImageBlockParam,
} from "../../../../../server/core/claude-code/schema";
import { useConfig } from "../../../../hooks/useConfig";
import { ClaudeCodeSettingsPopover } from "./ClaudeCodeSettingsForm";
import type { CommandCompletionRef } from "./CommandCompletion";
import { getDefaultCCOptions } from "./ccOptionsFormSchema";
import { isInCompletionContext } from "./completionUtils";
import type { FileCompletionRef } from "./FileCompletion";
import { processFile } from "./fileUtils";
import { InlineCompletion } from "./InlineCompletion";

export interface MessageInput {
  text: string;
  images?: ImageBlockParam[];
  documents?: DocumentBlockParam[];
  ccOptions?: CCOptionsSchema;
  forkSession?: boolean;
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
  enableCCOptions?: boolean;
}

export const ChatInput: FC<ChatInputProps> = ({
  projectId,
  onSubmit,
  isPending,
  error,
  placeholder,
  buttonText,
  minHeight: minHeightProp = "min-h-[64px]",
  containerClassName = "",
  disabled = false,
  buttonSize = "lg",
  enableScheduledSend = false,
  baseSessionId = null,
  enableCCOptions = false,
}) => {
  // Parse minHeight prop to get pixel value (default to 48px for 1.5 lines)
  // Supports both "200px" and Tailwind format like "min-h-[200px]"
  const parseMinHeight = (value: string): number => {
    // Try to extract pixel value using regex (handles both formats)
    const match = value.match(/(\d+)px/);
    if (match?.[1]) {
      const parsed = parseInt(match[1], 10);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
    // Fallback to default
    return 48;
  };
  const minHeightValue = parseMinHeight(minHeightProp);
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
  // Initialize with default values so settingSources is always sent correctly
  // even when the user doesn't open the settings popover
  const [ccOptions, setCCOptions] = useState<CCOptionsSchema | undefined>(
    getDefaultCCOptions,
  );
  const [forkSession, setForkSession] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const commandCompletionRef = useRef<CommandCompletionRef>(null);
  const fileCompletionRef = useRef<FileCompletionRef>(null);
  const helpId = useId();
  const { config } = useConfig();
  const createSchedulerJob = useCreateSchedulerJob();

  // Auto-resize textarea based on content
  // biome-ignore lint/correctness/useExhaustiveDependencies: message is intentionally included to trigger resize
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = "auto";
    // Set height to scrollHeight, but respect min/max constraints
    const scrollHeight = textarea.scrollHeight;
    const maxHeight = 200; // Maximum height in pixels (approx 5 lines)
    textarea.style.height = `${Math.max(minHeightValue, Math.min(scrollHeight, maxHeight))}px`;
  }, [message, minHeightValue]);

  // Set initial height to 1 line on mount
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    // Set initial height to minHeight value
    textarea.style.height = `${minHeightValue}px`;
  }, [minHeightValue]);

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
            baseSession: baseSessionId
              ? { type: "resume", sessionId: baseSessionId }
              : null,
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
        ccOptions: ccOptions,
        forkSession: baseSessionId ? forkSession : undefined,
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
            <Trans id="chat.error.send_failed" />
          </span>
        </div>
      )}

      <div className="relative group">
        <div
          className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-2xl blur opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-500 will-change-opacity"
          aria-hidden="true"
        />

        <div className="relative bg-background border border-border/40 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden ring-0 group-focus-within:ring-1 group-focus-within:ring-primary/20 group-focus-within:border-primary/20">
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
              className="resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent px-5 py-4 text-base transition-all duration-200 placeholder:text-muted-foreground/50 overflow-y-auto leading-relaxed antialiased font-normal"
              style={{
                minHeight: `${minHeightValue}px`,
              }}
              disabled={isPending || disabled}
              aria-label={i18n._("Message input with completion support")}
              aria-describedby={helpId}
              aria-expanded={isInCompletionContext(message)}
              aria-haspopup="listbox"
              role="combobox"
              aria-autocomplete="list"
            />
          </div>

          {attachedFiles.length > 0 && (
            <div className="px-5 py-3 flex flex-wrap gap-2 border-t border-border/40 bg-muted/10 animate-in fade-in slide-in-from-top-1 duration-200">
              {attachedFiles.map(({ file, id }) => (
                <div
                  key={id}
                  className="flex items-center gap-2 px-3 py-1.5 bg-background border border-border/50 shadow-sm rounded-lg text-sm text-foreground/80 hover:text-foreground hover:border-foreground/20 transition-all duration-200"
                >
                  <span className="truncate max-w-[200px] font-medium">
                    {file.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(id)}
                    className="text-muted-foreground hover:text-red-500 transition-colors bg-transparent rounded-full p-0.5 hover:bg-muted"
                    disabled={isPending}
                  >
                    <XIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-2 px-5 py-1 bg-muted/10 border-t border-border/30 backdrop-blur-sm">
            {enableScheduledSend && sendMode === "scheduled" && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1 animate-in fade-in duration-200">
                <Label htmlFor="send-mode-mobile" className="text-xs sr-only">
                  <Trans id="chat.send_mode.label" />
                </Label>
                <Select
                  value={sendMode}
                  onValueChange={(value: "immediate" | "scheduled") =>
                    setSendMode(value)
                  }
                  disabled={isPending || disabled}
                >
                  <SelectTrigger
                    id="send-mode-mobile"
                    className="h-8 w-full sm:w-[140px] text-xs bg-background/50 border-border/50 shadow-sm focus:ring-primary/20"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">
                      <Trans id="chat.send_mode.immediate" />
                    </SelectItem>
                    <SelectItem value="scheduled">
                      <Trans id="chat.send_mode.scheduled" />
                    </SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-1.5 flex-1">
                  <Label htmlFor="scheduled-time" className="text-xs sr-only">
                    <Trans id="chat.send_mode.scheduled_time" />
                  </Label>
                  <Input
                    id="scheduled-time"
                    type="datetime-local"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    disabled={isPending || disabled}
                    className="h-8 w-full sm:w-[180px] text-xs bg-background/50 border-border/50 shadow-sm focus:ring-primary/20"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 text-muted-foreground/70">
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
                  className="gap-2 px-2 hover:bg-background/80 hover:text-foreground text-muted-foreground transition-all duration-200 h-8 rounded-lg"
                >
                  <PaperclipIcon className="w-4 h-4" />
                  <span className="text-xs font-medium hidden sm:inline">
                    <Trans id="chat.attach_file" />
                  </span>
                </Button>
                {message.length > 0 && (
                  <span
                    className="text-[10px] font-medium bg-muted/50 px-2 py-0.5 rounded-full border border-border/30 transition-all duration-200"
                    id={helpId}
                  >
                    {message.length}
                  </span>
                )}
                {enableCCOptions && (
                  <ClaudeCodeSettingsPopover
                    value={ccOptions}
                    onChange={setCCOptions}
                    disabled={isPending || disabled}
                    showForkOption={Boolean(baseSessionId)}
                    forkSession={forkSession}
                    onForkSessionChange={setForkSession}
                  />
                )}
              </div>

              <div className="flex items-center gap-2">
                {enableScheduledSend && sendMode === "immediate" && (
                  <div className="hidden sm:flex items-center gap-2">
                    <Label
                      htmlFor="send-mode-desktop"
                      className="text-xs sr-only"
                    >
                      <Trans id="chat.send_mode.label" />
                    </Label>
                    <Select
                      value={sendMode}
                      onValueChange={(value: "immediate" | "scheduled") =>
                        setSendMode(value)
                      }
                      disabled={isPending || disabled}
                    >
                      <SelectTrigger
                        id="send-mode-desktop"
                        className="h-9 w-[140px] text-xs font-medium bg-background/50 border-transparent hover:bg-background hover:border-border/50 shadow-none hover:shadow-sm focus:ring-1 focus:ring-primary/20 transition-all duration-200"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="immediate">
                          <Trans id="chat.send_mode.immediate" />
                        </SelectItem>
                        <SelectItem value="scheduled">
                          <Trans id="chat.send_mode.scheduled" />
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {enableScheduledSend && sendMode === "immediate" && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSendMode("scheduled")}
                    disabled={isPending || disabled}
                    className="sm:hidden gap-1.5 h-9"
                  >
                    <span className="text-xs font-medium">
                      <Trans id="chat.send_mode.scheduled" />
                    </span>
                  </Button>
                )}

                <Button
                  onClick={handleSubmit}
                  disabled={
                    (!message.trim() && attachedFiles.length === 0) ||
                    isPending ||
                    disabled
                  }
                  size={buttonSize}
                  className="gap-2 px-6 h-9 transition-all duration-300 shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 disabled:from-muted disabled:to-muted disabled:shadow-none bg-[length:200%_auto] hover:bg-[position:right_center]"
                >
                  {isPending ? (
                    <>
                      <LoaderIcon className="w-4 h-4 animate-spin" />
                      <span className="hidden sm:inline font-medium">
                        <Trans id="chat.status.processing" />
                      </span>
                    </>
                  ) : (
                    <>
                      <SendIcon className="w-4 h-4" />
                      <span className="hidden sm:inline font-medium">
                        {buttonText}
                      </span>
                    </>
                  )}
                </Button>
              </div>
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
