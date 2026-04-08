import { describe, expect, test } from "vitest";
import type { AssistantEntry } from "@/lib/conversation-schema/entry/AssistantEntrySchema";
import type { UserEntry } from "@/lib/conversation-schema/entry/UserEntrySchema";
import type { ExtendedConversation } from "@/server/core/types";
import { buildTaskModalConversations } from "./buildTaskModalConversations";

const makeUserEntry = (content: string, uuid: string): UserEntry => ({
  type: "user",
  message: { role: "user", content },
  isSidechain: true,
  userType: "external",
  cwd: "/test",
  sessionId: "test-session",
  version: "1.0.0",
  uuid,
  timestamp: "2026-01-01T00:00:00Z",
  parentUuid: null,
  isMeta: false,
  toolUseResult: undefined,
  gitBranch: "main",
  isCompactSummary: false,
});

const makeAssistantEntry = (text: string, uuid: string): AssistantEntry => ({
  type: "assistant",
  message: {
    role: "assistant",
    model: "claude-sonnet-4-6",
    id: `msg_${uuid}`,
    type: "message",
    content: [{ type: "text", text }],
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: { input_tokens: 0, output_tokens: 0 },
  },
  isSidechain: true,
  userType: "external",
  cwd: "/test",
  sessionId: "test-session",
  version: "1.0.0",
  uuid,
  timestamp: "2026-01-01T00:00:01Z",
  parentUuid: null,
  gitBranch: "main",
});

const meta = {
  cwd: "/test",
  version: "1.0.0",
  timestamp: "2026-01-01T00:00:00Z",
  gitBranch: "main",
};

describe("buildTaskModalConversations", () => {
  const prompt = "Do something";

  test("should NOT duplicate first user message when API data starts with user entry", () => {
    const apiUserEntry = makeUserEntry(prompt, "real-uuid-1");
    const apiAssistantEntry = makeAssistantEntry("OK", "real-uuid-2");
    const apiConversations: ExtendedConversation[] = [apiUserEntry, apiAssistantEntry];

    const result = buildTaskModalConversations({
      hasLocalData: false,
      apiConversations,
      conversations: apiConversations,
      prompt,
      sessionId: "test-session",
      firstConversationMeta: meta,
    });

    // The first user message should appear exactly once
    const userMessages = result.filter((c) => c.type === "user");
    expect(userMessages).toHaveLength(1);

    // Total should be 2 (1 user + 1 assistant), not 3
    expect(result).toHaveLength(2);
  });

  test("should prepend synthetic entry when API data does NOT start with user entry", () => {
    const apiAssistantEntry = makeAssistantEntry("OK", "real-uuid-2");
    const apiConversations: ExtendedConversation[] = [apiAssistantEntry];

    const result = buildTaskModalConversations({
      hasLocalData: false,
      apiConversations,
      conversations: apiConversations,
      prompt,
      sessionId: "test-session",
      firstConversationMeta: meta,
    });

    // Should have synthetic user entry + assistant = 2
    expect(result).toHaveLength(2);
    expect(result[0]?.type).toBe("user");
    expect(result[1]?.type).toBe("assistant");
  });

  test("should NOT prepend synthetic entry when using local sidechain data", () => {
    const localConversations: ExtendedConversation[] = [
      makeUserEntry(prompt, "local-uuid-1"),
      makeAssistantEntry("OK", "local-uuid-2"),
    ];

    const result = buildTaskModalConversations({
      hasLocalData: true,
      apiConversations: [],
      conversations: localConversations,
      prompt,
      sessionId: "test-session",
      firstConversationMeta: meta,
    });

    expect(result).toHaveLength(2);
    const userMessages = result.filter((c) => c.type === "user");
    expect(userMessages).toHaveLength(1);
  });

  test("should set isSidechain to false on all output conversations", () => {
    const apiUserEntry = makeUserEntry(prompt, "real-uuid-1");
    const apiConversations: ExtendedConversation[] = [apiUserEntry];

    const result = buildTaskModalConversations({
      hasLocalData: false,
      apiConversations,
      conversations: apiConversations,
      prompt,
      sessionId: "test-session",
      firstConversationMeta: meta,
    });

    const sidechainValues = result
      .filter(
        (conv): conv is Extract<typeof conv, { isSidechain: boolean }> => "isSidechain" in conv,
      )
      .map((conv) => conv.isSidechain);

    expect(sidechainValues).toEqual([false]);
  });
});
