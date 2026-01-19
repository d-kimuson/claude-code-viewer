import type { Conversation } from "../../../../lib/conversation-schema";

export interface ActivityEntry {
  id: string;
  projectId: string;
  sessionId: string;
  entryType: "user" | "assistant" | "system" | "tool" | "unknown";
  preview: string;
  timestamp: string;
  rawEntry: Conversation;
}

export interface ActivityFeedState {
  entries: ActivityEntry[];
  filePositions: Map<string, number>;
}
