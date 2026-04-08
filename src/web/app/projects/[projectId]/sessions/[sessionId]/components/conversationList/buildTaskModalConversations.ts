import type { UserEntry } from "@/lib/conversation-schema/entry/UserEntrySchema";
import type { ExtendedConversation } from "@/server/core/types";

type ConversationMetadata = {
  cwd: string;
  version: string;
  timestamp: string;
  gitBranch?: string;
};

/**
 * Build the conversation list for the TaskModal.
 *
 * When agent session data is fetched from the API (separate agent-*.jsonl files),
 * the first entry is already the user's prompt. A synthetic user entry must NOT
 * be prepended in that case, otherwise the prompt appears twice.
 *
 * A synthetic entry is only needed when the API returns conversations that do
 * not start with a user message (legacy or edge cases).
 */
export const buildTaskModalConversations = (options: {
  hasLocalData: boolean;
  apiConversations: readonly ExtendedConversation[];
  conversations: readonly ExtendedConversation[];
  prompt: string;
  sessionId: string;
  firstConversationMeta: ConversationMetadata | undefined;
}): ExtendedConversation[] => {
  const {
    hasLocalData,
    apiConversations,
    conversations,
    prompt,
    sessionId,
    firstConversationMeta,
  } = options;

  const apiDataHasFirstUserMessage =
    !hasLocalData && apiConversations.length > 0 && apiConversations[0]?.type === "user";

  const syntheticEntry: UserEntry = {
    type: "user",
    message: {
      role: "user",
      content: prompt,
    },
    isSidechain: false,
    userType: "external",
    cwd: firstConversationMeta?.cwd ?? "dummy",
    sessionId: sessionId,
    version: firstConversationMeta?.version ?? "dummy",
    uuid: "dummy",
    timestamp: firstConversationMeta?.timestamp ?? "dummy",
    parentUuid: null,
    isMeta: false,
    toolUseResult: undefined,
    gitBranch: firstConversationMeta?.gitBranch ?? "dummy",
    isCompactSummary: false,
  };

  const prefix: ExtendedConversation[] =
    hasLocalData || apiDataHasFirstUserMessage ? [] : [syntheticEntry];

  return [
    ...prefix,
    ...conversations.map((c) => ({
      ...c,
      isSidechain: false,
    })),
  ];
};
