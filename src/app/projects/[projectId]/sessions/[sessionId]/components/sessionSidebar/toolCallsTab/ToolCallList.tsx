import { Trans } from "@lingui/react";
import { InfoIcon } from "lucide-react";
import type { FC } from "react";
import type { ToolCallInfo } from "../../../utils/toolCallExtraction";
import { ToolCallItem } from "./ToolCallItem";

type ToolCallListProps = {
  toolCalls: ToolCallInfo[];
  onNavigate: (conversationIndex: number) => void;
};

export const ToolCallList: FC<ToolCallListProps> = ({
  toolCalls,
  onNavigate,
}) => {
  if (toolCalls.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-sidebar-foreground/60">
        <InfoIcon className="w-8 h-8 mb-3" />
        <p className="text-sm text-center">
          <Trans id="tool.calls.list.empty" />
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 p-4">
      {toolCalls.map((toolCall) => (
        <ToolCallItem
          key={toolCall.toolUseId}
          toolCall={toolCall}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  );
};
