import type { FC, RefObject } from "react";
import { useMemo } from "react";
import {
  CommandCompletion,
  type CommandCompletionRef,
} from "./CommandCompletion";
import { FileCompletion, type FileCompletionRef } from "./FileCompletion";

interface PositionStyle {
  top: number;
  left: number;
  placement: "above" | "below";
}

const calculateOptimalPosition = (
  relativeCursorPosition: { top: number; left: number },
  absoluteCursorPosition: { top: number; left: number },
  itemCount: number,
): PositionStyle => {
  const viewportHeight =
    typeof window !== "undefined" ? window.innerHeight : 800;
  const viewportCenter = viewportHeight / 2;

  // Calculate dynamic height based on item count
  // Header: ~48px, Each item: 36px (h-9), Padding: 12px
  const headerHeight = 48;
  const itemHeight = 36;
  const padding = 12;
  const maxItems = 5;
  const visibleItems = Math.min(itemCount, maxItems);
  const estimatedCompletionHeight =
    headerHeight + itemHeight * visibleItems + padding;

  // Determine preferred placement based on viewport position
  const isInUpperHalf = absoluteCursorPosition.top < viewportCenter;

  // Check if there's enough space for preferred placement
  const spaceBelow = viewportHeight - absoluteCursorPosition.top;
  const spaceAbove = absoluteCursorPosition.top;

  let placement: "above" | "below";
  let top: number;

  if (isInUpperHalf && spaceBelow >= estimatedCompletionHeight + 20) {
    // Cursor in upper half and enough space below - place below
    placement = "below";
    top = relativeCursorPosition.top + 24;
  } else if (!isInUpperHalf && spaceAbove >= estimatedCompletionHeight + 20) {
    // Cursor in lower half and enough space above - place above
    placement = "above";
    top = relativeCursorPosition.top - estimatedCompletionHeight - 16;
  } else {
    // Use whichever side has more space
    if (spaceBelow > spaceAbove) {
      placement = "below";
      top = relativeCursorPosition.top + 24;
    } else {
      placement = "above";
      top = relativeCursorPosition.top - estimatedCompletionHeight - 16;
    }
  }

  // Ensure left position stays within viewport bounds
  const estimatedCompletionWidth = 512; // Current w-lg width
  const viewportWidth =
    typeof window !== "undefined" ? window.innerWidth : 1200;
  const maxLeft = viewportWidth - estimatedCompletionWidth - 16;
  const adjustedLeft = Math.max(
    16,
    Math.min(relativeCursorPosition.left - 16, maxLeft),
  );

  return {
    top,
    left: adjustedLeft,
    placement,
  };
};

export const InlineCompletion: FC<{
  projectId: string;
  message: string;
  commandCompletionRef: RefObject<CommandCompletionRef | null>;
  fileCompletionRef: RefObject<FileCompletionRef | null>;
  handleCommandSelect: (command: string) => void;
  handleFileSelect: (filePath: string) => void;
  cursorPosition: {
    relative: { top: number; left: number };
    absolute: { top: number; left: number };
  };
}> = ({
  projectId,
  message,
  commandCompletionRef,
  fileCompletionRef,
  handleCommandSelect,
  handleFileSelect,
  cursorPosition,
}) => {
  const position = useMemo(() => {
    return calculateOptimalPosition(
      cursorPosition.relative,
      cursorPosition.absolute,
      5,
    );
  }, [cursorPosition]);

  return (
    <div
      className="absolute w-full max-w-sm sm:max-w-md lg:max-w-lg xl:max-w-xl"
      style={{
        top: position.top,
        left: position.left,
        maxWidth:
          typeof window !== "undefined"
            ? Math.min(512, window.innerWidth * 0.8)
            : 512,
      }}
    >
      <CommandCompletion
        ref={commandCompletionRef}
        projectId={projectId}
        inputValue={message}
        onCommandSelect={handleCommandSelect}
        className={`absolute left-0 right-0 ${
          position.placement === "above" ? "bottom-full mb-2" : "top-full mt-1"
        }`}
      />
      <FileCompletion
        ref={fileCompletionRef}
        projectId={projectId}
        inputValue={message}
        onFileSelect={handleFileSelect}
        className={`absolute left-0 right-0 ${
          position.placement === "above" ? "bottom-full mb-2" : "top-full mt-1"
        }`}
      />
    </div>
  );
};
