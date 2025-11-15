import { ChevronDown } from "lucide-react";
import type { FC } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { normalizeQueueOperationContent } from "@/lib/conversation-schema/entry/normalizeQueueOperationContent";
import type { QueueOperationEntry } from "@/lib/conversation-schema/entry/QueueOperationEntrySchema";

export const QueueOperationConversationContent: FC<{
  conversation: QueueOperationEntry;
}> = ({ conversation }) => {
  const title =
    conversation.operation === "enqueue"
      ? "Queue Operation: Enqueue"
      : "Queue Operation: Dequeue";

  return (
    <Collapsible>
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between cursor-pointer hover:bg-muted/50 rounded p-2 -mx-2">
          <h4 className="text-xs font-medium text-muted-foreground">{title}</h4>
          <ChevronDown className="h-3 w-3 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="bg-background rounded border p-3 mt-2">
          <div className="space-y-2 text-xs">
            <div>
              <span className="font-medium text-muted-foreground">
                Operation:
              </span>{" "}
              {conversation.operation}
            </div>
            <div>
              <span className="font-medium text-muted-foreground">
                Session ID:
              </span>{" "}
              {conversation.sessionId}
            </div>
            <div>
              <span className="font-medium text-muted-foreground">
                Timestamp:
              </span>{" "}
              {conversation.timestamp}
            </div>
            {conversation.operation === "enqueue" && (
              <div>
                <span className="font-medium text-muted-foreground">
                  Content:
                </span>
                <pre className="mt-1 overflow-x-auto whitespace-pre-wrap">
                  {normalizeQueueOperationContent(conversation.content)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
