import { z } from "zod";
import { AgentNameEntrySchema } from "./entry/AgentNameEntrySchema";
import {
  type AssistantEntry,
  AssistantEntrySchema,
} from "./entry/AssistantEntrySchema";
import { CustomTitleEntrySchema } from "./entry/CustomTitleEntrySchema";
import { FileHistorySnapshotEntrySchema } from "./entry/FileHIstorySnapshotEntrySchema";
import { LastPromptEntrySchema } from "./entry/LastPromptEntrySchema";
import { PrLinkEntrySchema } from "./entry/PrLinkEntrySchema";
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
  CustomTitleEntrySchema,
  AgentNameEntrySchema,
  PrLinkEntrySchema,
  LastPromptEntrySchema,
]);

export type Conversation = z.infer<typeof ConversationSchema>;
export type SidechainConversation = UserEntry | AssistantEntry | SystemEntry;
