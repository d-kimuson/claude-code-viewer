import { ClockIcon, WrenchIcon } from "lucide-react";
import type { FC } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { ToolCallInfo } from "../../../utils/toolCallExtraction";

type ToolCallItemProps = {
  toolCall: ToolCallInfo;
  onNavigate: (conversationIndex: number) => void;
};

/**
 * Extract a summary string from tool input for display
 */
const extractInputSummary = (
  toolName: string,
  toolInput: Record<string, unknown>,
): string => {
  const getText = (value: unknown): string => {
    if (typeof value === "string") {
      return value;
    }
    return "";
  };

  switch (toolName) {
    case "Edit":
    case "Read":
    case "Write":
      return getText(toolInput.file_path);

    case "Bash": {
      const command = getText(toolInput.command);
      // Limit command length for display
      return command.length > 60 ? `${command.slice(0, 60)}...` : command;
    }

    case "Glob":
      return getText(toolInput.pattern);

    case "Grep":
      return getText(toolInput.pattern);

    default: {
      // For other tools, show first input value if available
      const entries = Object.entries(toolInput);
      if (entries.length === 0) return "";
      const firstEntry = entries[0];
      if (!firstEntry) return "";
      const [, value] = firstEntry;
      const text = getText(value);
      return text.length > 60 ? `${text.slice(0, 60)}...` : text;
    }
  }
};

/**
 * Format timestamp to local time string
 */
const formatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString();
};

export const ToolCallItem: FC<ToolCallItemProps> = ({
  toolCall,
  onNavigate,
}) => {
  const inputSummary = extractInputSummary(
    toolCall.toolName,
    toolCall.toolInput,
  );

  return (
    <Card
      className="border-sidebar-border bg-sidebar-accent/30 hover:bg-sidebar-accent/50 cursor-pointer transition-colors p-3 space-y-2"
      onClick={() => onNavigate(toolCall.conversationIndex)}
    >
      <div className="flex items-center gap-2">
        <WrenchIcon className="w-4 h-4 text-sidebar-foreground/70 flex-shrink-0" />
        <Badge
          variant="outline"
          className="text-xs font-medium border-sidebar-border"
        >
          {toolCall.toolName}
        </Badge>
      </div>

      {inputSummary && (
        <div className="text-sm text-sidebar-foreground/90 truncate font-mono">
          {inputSummary}
        </div>
      )}

      <div className="flex items-center gap-1 text-xs text-sidebar-foreground/60">
        <ClockIcon className="w-3 h-3" />
        <span>{formatTimestamp(toolCall.timestamp)}</span>
      </div>
    </Card>
  );
};
