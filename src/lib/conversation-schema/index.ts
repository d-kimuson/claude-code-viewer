import { z } from "zod";
import {
  type AssistantEntry,
  AssistantEntrySchema,
} from "./entry/AssistantEntrySchema";
import { FileHistorySnapshotEntrySchema } from "./entry/FileHIstorySnapshotEntrySchema";
import { QueueOperationEntrySchema } from "./entry/QueueOperationEntrySchema";
import { SummaryEntrySchema } from "./entry/SummaryEntrySchema";
import {
  type SystemEntry,
  SystemEntrySchema,
  type ApiError,
  ApiErrorSchema,
} from "./entry/SystemEntrySchema";
import { type UserEntry, UserEntrySchema } from "./entry/UserEntrySchema";

export const ConversationSchema = z.union([
  UserEntrySchema,
  AssistantEntrySchema,
  SummaryEntrySchema,
  SystemEntrySchema,
  FileHistorySnapshotEntrySchema,
  QueueOperationEntrySchema,
]);

export type Conversation = z.infer<typeof ConversationSchema>;
export type SidechainConversation = UserEntry | AssistantEntry | SystemEntry;

// Re-export ApiError types for external use
export type { ApiError };
export { ApiErrorSchema };
