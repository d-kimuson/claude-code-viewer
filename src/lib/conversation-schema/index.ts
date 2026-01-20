import { z } from "zod";
import {
  type AssistantEntry,
  AssistantEntrySchema,
} from "./entry/AssistantEntrySchema";
import { FileHistorySnapshotEntrySchema } from "./entry/FileHIstorySnapshotEntrySchema";
import { ProgressEntrySchema } from "./entry/ProgressEntrySchema";
import { QueueOperationEntrySchema } from "./entry/QueueOperationEntrySchema";
import { SummaryEntrySchema } from "./entry/SummaryEntrySchema";
import { type SystemEntry, SystemEntrySchema } from "./entry/SystemEntrySchema";

import { type UserEntry, UserEntrySchema } from "./entry/UserEntrySchema";

export const ConversationSchema = z.union([
  UserEntrySchema,
  AssistantEntrySchema,
  SummaryEntrySchema,
  SystemEntrySchema,
  FileHistorySnapshotEntrySchema,
  QueueOperationEntrySchema,
  ProgressEntrySchema,
]);

export type Conversation = z.infer<typeof ConversationSchema>;
export type SidechainConversation = UserEntry | AssistantEntry | SystemEntry;
