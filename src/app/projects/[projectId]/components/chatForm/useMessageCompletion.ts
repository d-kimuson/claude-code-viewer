import { useCallback, useRef, useState } from "react";
import type { CommandCompletionRef } from "./CommandCompletion";
import type { FileCompletionRef } from "./FileCompletion";

export interface UseMessageCompletionResult {
  cursorPosition: {
    relative: { top: number; left: number };
    absolute: { top: number; left: number };
  };
  containerRef: React.RefObject<HTMLDivElement | null>;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  commandCompletionRef: React.RefObject<CommandCompletionRef | null>;
  fileCompletionRef: React.RefObject<FileCompletionRef | null>;
  getCursorPosition: () =>
    | {
        relative: { top: number; left: number };
        absolute: { top: number; left: number };
      }
    | undefined;
  handleChange: (value: string, onChange: (value: string) => void) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => boolean;
  handleCommandSelect: (
    command: string,
    onSelect: (command: string) => void,
  ) => void;
  handleFileSelect: (
    filePath: string,
    onSelect: (filePath: string) => void,
  ) => void;
}

/**
 * Message input with command and file completion support
 */
export function useMessageCompletion(): UseMessageCompletionResult {
  const [cursorPosition, setCursorPosition] = useState<{
    relative: { top: number; left: number };
    absolute: { top: number; left: number };
  }>({ relative: { top: 0, left: 0 }, absolute: { top: 0, left: 0 } });

  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const commandCompletionRef = useRef<CommandCompletionRef>(null);
  const fileCompletionRef = useRef<FileCompletionRef>(null);

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

  const handleChange = useCallback(
    (value: string, onChange: (value: string) => void) => {
      if (value.endsWith("@") || value.endsWith("/")) {
        const position = getCursorPosition();
        if (position) {
          setCursorPosition(position);
        }
      }
      onChange(value);
    },
    [getCursorPosition],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>): boolean => {
      if (fileCompletionRef.current?.handleKeyDown(e)) {
        return true;
      }

      if (commandCompletionRef.current?.handleKeyDown(e)) {
        return true;
      }

      return false;
    },
    [],
  );

  const handleCommandSelect = useCallback(
    (command: string, onSelect: (command: string) => void) => {
      onSelect(command);
      textareaRef.current?.focus();
    },
    [],
  );

  const handleFileSelect = useCallback(
    (filePath: string, onSelect: (filePath: string) => void) => {
      onSelect(filePath);
      textareaRef.current?.focus();
    },
    [],
  );

  return {
    cursorPosition,
    containerRef,
    textareaRef,
    commandCompletionRef,
    fileCompletionRef,
    getCursorPosition,
    handleChange,
    handleKeyDown,
    handleCommandSelect,
    handleFileSelect,
  };
}
