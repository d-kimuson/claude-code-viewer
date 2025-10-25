import type { FileHistorySnapshotEntry } from "@claude-code-viewer/shared/conversation-schema/entry/FileHIstorySnapshotEntrySchema";
import { ChevronDown } from "lucide-react";
import type { FC } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { formatLocaleDate } from "../../../../../../../lib/date/formatLocaleDate";
import { useConfig } from "../../../../../../hooks/useConfig";

export const FileHistorySnapshotConversationContent: FC<{
  conversation: FileHistorySnapshotEntry;
}> = ({ conversation }) => {
  const fileCount = Object.keys(
    conversation.snapshot.trackedFileBackups,
  ).length;
  const { config } = useConfig();

  return (
    <Collapsible>
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between cursor-pointer hover:bg-muted/50 rounded p-2 -mx-2">
          <h4 className="text-xs font-medium text-muted-foreground">
            File History Snapshot {fileCount > 0 && `(${fileCount} files)`}
          </h4>
          <ChevronDown className="h-3 w-3 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="bg-background rounded border p-3 mt-2">
          <div className="space-y-2">
            <div className="text-xs">
              <span className="text-muted-foreground">Timestamp: </span>
              <span>
                {formatLocaleDate(conversation.snapshot.timestamp, {
                  locale: config.locale,
                })}
              </span>
            </div>
            <div className="text-xs">
              <span className="text-muted-foreground">Message ID: </span>
              <span className="font-mono">{conversation.messageId}</span>
            </div>
            <div className="text-xs">
              <span className="text-muted-foreground">
                Is Snapshot Update:{" "}
              </span>
              <span>{conversation.isSnapshotUpdate ? "Yes" : "No"}</span>
            </div>
            {fileCount > 0 && (
              <div className="text-xs">
                <div className="text-muted-foreground mb-1">Tracked Files:</div>
                <ul className="list-disc list-inside space-y-1">
                  {Object.keys(conversation.snapshot.trackedFileBackups).map(
                    (filePath) => (
                      <li
                        key={filePath}
                        className="font-mono text-xs break-all"
                      >
                        {filePath}
                      </li>
                    ),
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
