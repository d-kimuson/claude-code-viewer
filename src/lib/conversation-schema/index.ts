import { z } from "zod";
import { AgentNameEntrySchema } from "./entry/AgentNameEntrySchema.ts";
import { AgentSettingEntrySchema } from "./entry/AgentSettingEntrySchema.ts";
import { AiTitleEntrySchema } from "./entry/AiTitleEntrySchema.ts";
import { type AssistantEntry, AssistantEntrySchema } from "./entry/AssistantEntrySchema.ts";
import { AttachmentEntrySchema } from "./entry/AttachmentEntrySchema.ts";
import { BridgeSessionEntrySchema } from "./entry/BridgeSessionEntrySchema.ts";
import { CustomTitleEntrySchema } from "./entry/CustomTitleEntrySchema.ts";
import { FileHistorySnapshotEntrySchema } from "./entry/FileHIstorySnapshotEntrySchema.ts";
import { LastPromptEntrySchema } from "./entry/LastPromptEntrySchema.ts";
import { ModeEntrySchema } from "./entry/ModeEntrySchema.ts";
import { PermissionModeEntrySchema } from "./entry/PermissionModeEntrySchema.ts";
import { PrLinkEntrySchema } from "./entry/PrLinkEntrySchema.ts";
import { ProgressEntrySchema } from "./entry/ProgressEntrySchema.ts";
import { QueueOperationEntrySchema } from "./entry/QueueOperationEntrySchema.ts";
import { SummaryEntrySchema } from "./entry/SummaryEntrySchema.ts";
import { type SystemEntry, SystemEntrySchema } from "./entry/SystemEntrySchema.ts";
import { createUnknownEntrySchema, type UnknownEntry } from "./entry/UnknownEntrySchema.ts";
import { type UserEntry, UserEntrySchema } from "./entry/UserEntrySchema.ts";

// Entry types the viewer models explicitly. Keep in sync with the union below:
// the unknown-entry fallback refuses these types, so a malformed entry of a
// modelled type still fails validation instead of being silently accepted.
export const KNOWN_ENTRY_TYPES = new Set<string>([
  "user",
  "assistant",
  "summary",
  "system",
  "file-history-snapshot",
  "queue-operation",
  "progress",
  "custom-title",
  "ai-title",
  "agent-name",
  "agent-setting",
  "permission-mode",
  "mode",
  "pr-link",
  "last-prompt",
  "bridge-session",
  "attachment",
]);

export const ConversationSchema = z.union([
  UserEntrySchema,
  AssistantEntrySchema,
  SummaryEntrySchema,
  SystemEntrySchema,
  FileHistorySnapshotEntrySchema,
  QueueOperationEntrySchema,
  ProgressEntrySchema,
  CustomTitleEntrySchema,
  AiTitleEntrySchema,
  AgentNameEntrySchema,
  AgentSettingEntrySchema,
  PermissionModeEntrySchema,
  ModeEntrySchema,
  PrLinkEntrySchema,
  LastPromptEntrySchema,
  BridgeSessionEntrySchema,
  AttachmentEntrySchema,
  // Must stay last: any entry whose `type` is not modelled above lands here
  // as a typed `unknown-entry` instead of failing the whole line (#231).
  createUnknownEntrySchema(KNOWN_ENTRY_TYPES),
]);

export type Conversation = z.infer<typeof ConversationSchema>;
export type { UnknownEntry };
export type SidechainConversation = UserEntry | AssistantEntry | SystemEntry;
