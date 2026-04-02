import { describe, expect, it } from "vitest";
import type { Conversation } from "@/lib/conversation-schema";
import { parseUuid } from "@/lib/uuid";
import type { ErrorJsonl } from "@/server/core/types";
import { buildRenderableConversationRows, getConversationKey } from "./conversationRows";

// ---- Factories ----

const base = {
  isSidechain: false,
  userType: "external" as const,
  cwd: "/tmp",
  sessionId: "session-1",
  version: "1.0.0",
  parentUuid: null,
};

const makeUser = (uuid: string): Extract<Conversation, { type: "user" }> => ({
  ...base,
  type: "user",
  uuid,
  timestamp: "2024-01-01T00:00:00.000Z",
  message: { role: "user", content: "hello" },
});

const makeAssistant = (uuid: string): Extract<Conversation, { type: "assistant" }> => ({
  ...base,
  type: "assistant",
  uuid,
  timestamp: "2024-01-01T00:00:01.000Z",
  parentUuid: null,
  message: {
    id: "msg-1",
    type: "message",
    role: "assistant",
    model: "claude-3-5-sonnet-20241022",
    content: [{ type: "text", text: "hi" }],
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: { input_tokens: 10, output_tokens: 20 },
  },
});

const makeSystem = (uuid: string): Extract<Conversation, { type: "system" }> => ({
  ...base,
  type: "system",
  uuid,
  timestamp: "2024-01-01T00:00:02.000Z",
  subtype: undefined,
  content: "System message",
  toolUseID: "tool-1",
  level: "info",
});

const makeSummary = (leafUuid: string): Extract<Conversation, { type: "summary" }> => ({
  type: "summary",
  summary: "A summary",
  leafUuid: parseUuid(leafUuid),
});

const makeFileHistorySnapshot = (
  messageId: string,
): Extract<Conversation, { type: "file-history-snapshot" }> => ({
  type: "file-history-snapshot",
  messageId,
  snapshot: {
    messageId,
    trackedFileBackups: {},
    timestamp: "2024-01-01T00:00:00.000Z",
  },
  isSnapshotUpdate: false,
});

const makeQueueOperation = (
  operation: "enqueue" | "dequeue" | "popAll",
  sessionId: string,
  timestamp: string,
): Extract<Conversation, { type: "queue-operation" }> => ({
  type: "queue-operation",
  operation,
  sessionId,
  timestamp,
});

const makeProgress = (uuid: string): Extract<Conversation, { type: "progress" }> => ({
  ...base,
  type: "progress",
  uuid,
  timestamp: "2024-01-01T00:00:03.000Z",
  data: { key: "value" },
});

const makeCustomTitle = (
  sessionId: string,
  customTitle: string,
): Extract<Conversation, { type: "custom-title" }> => ({
  type: "custom-title",
  sessionId,
  customTitle,
});

const makeAgentName = (
  sessionId: string,
  agentName: string,
): Extract<Conversation, { type: "agent-name" }> => ({
  type: "agent-name",
  sessionId,
  agentName,
});

const makePrLink = (
  sessionId: string,
  prNumber: number,
): Extract<Conversation, { type: "pr-link" }> => ({
  type: "pr-link",
  sessionId,
  prNumber,
  prUrl: "https://github.com/org/repo/pull/42",
  prRepository: "org/repo",
  timestamp: "2024-01-01T00:00:00.000Z",
});

const makeLastPrompt = (sessionId: string): Extract<Conversation, { type: "last-prompt" }> => ({
  type: "last-prompt",
  sessionId,
  lastPrompt: "What is the meaning of life?",
});

const makeError = (lineNumber: number): ErrorJsonl => ({
  type: "x-error",
  line: "{ invalid json",
  lineNumber,
});

// ---- Tests ----

describe("getConversationKey", () => {
  it("returns user key with uuid", () => {
    const conv = makeUser("550e8400-e29b-41d4-a716-446655440001");
    expect(getConversationKey(conv)).toBe("user_550e8400-e29b-41d4-a716-446655440001");
  });

  it("returns assistant key with uuid", () => {
    const conv = makeAssistant("550e8400-e29b-41d4-a716-446655440002");
    expect(getConversationKey(conv)).toBe("assistant_550e8400-e29b-41d4-a716-446655440002");
  });

  it("returns system key with uuid", () => {
    const conv = makeSystem("550e8400-e29b-41d4-a716-446655440003");
    expect(getConversationKey(conv)).toBe("system_550e8400-e29b-41d4-a716-446655440003");
  });

  it("returns summary key with leafUuid", () => {
    const conv = makeSummary("550e8400-e29b-41d4-a716-000000000001");
    expect(getConversationKey(conv)).toBe("summary_550e8400-e29b-41d4-a716-000000000001");
  });

  it("returns file-history-snapshot key with messageId", () => {
    const conv = makeFileHistorySnapshot("msg-snap-1");
    expect(getConversationKey(conv)).toBe("file-history-snapshot_msg-snap-1");
  });

  it("returns queue-operation key with operation, sessionId, timestamp", () => {
    const conv = makeQueueOperation("enqueue", "session-abc", "2024-01-01T00:00:00.000Z");
    expect(getConversationKey(conv)).toBe(
      "queue-operation_enqueue_session-abc_2024-01-01T00:00:00.000Z",
    );
  });

  it("returns progress key with uuid", () => {
    const conv = makeProgress("550e8400-e29b-41d4-a716-446655440004");
    expect(getConversationKey(conv)).toBe("progress_550e8400-e29b-41d4-a716-446655440004");
  });

  it("returns custom-title key with sessionId and customTitle", () => {
    const conv = makeCustomTitle("session-1", "My Session Title");
    expect(getConversationKey(conv)).toBe("custom-title_session-1_My Session Title");
  });

  it("returns agent-name key with sessionId and agentName", () => {
    const conv = makeAgentName("session-1", "claude-code-agent");
    expect(getConversationKey(conv)).toBe("agent-name_session-1_claude-code-agent");
  });

  it("returns pr-link key with sessionId and prNumber", () => {
    const conv = makePrLink("session-1", 42);
    expect(getConversationKey(conv)).toBe("pr-link_session-1_42");
  });

  it("returns last-prompt key with sessionId", () => {
    const conv = makeLastPrompt("session-1");
    expect(getConversationKey(conv)).toBe("last-prompt_session-1");
  });
});

describe("buildRenderableConversationRows - showTimestamp", () => {
  const renderAll = () => true;

  it("shows timestamp for user entries", () => {
    const rows = buildRenderableConversationRows(
      [makeUser("550e8400-e29b-41d4-a716-000000000001")],
      renderAll,
    );
    expect(rows[0]?.showTimestamp).toBe(true);
  });

  it("shows timestamp for assistant entries", () => {
    const rows = buildRenderableConversationRows(
      [makeAssistant("550e8400-e29b-41d4-a716-000000000002")],
      renderAll,
    );
    expect(rows[0]?.showTimestamp).toBe(true);
  });

  it("shows timestamp for system entries", () => {
    const rows = buildRenderableConversationRows(
      [makeSystem("550e8400-e29b-41d4-a716-000000000003")],
      renderAll,
    );
    expect(rows[0]?.showTimestamp).toBe(true);
  });

  it("shows timestamp for pr-link entries", () => {
    const rows = buildRenderableConversationRows([makePrLink("session-1", 42)], renderAll);
    expect(rows[0]?.showTimestamp).toBe(true);
  });

  it("shows timestamp for last-prompt entries", () => {
    const rows = buildRenderableConversationRows([makeLastPrompt("session-1")], renderAll);
    expect(rows[0]?.showTimestamp).toBe(true);
  });

  it("hides timestamp for summary entries", () => {
    const rows = buildRenderableConversationRows(
      [makeSummary("550e8400-e29b-41d4-a716-000000000001")],
      renderAll,
    );
    expect(rows[0]?.showTimestamp).toBe(false);
  });

  it("hides timestamp for progress entries", () => {
    const rows = buildRenderableConversationRows(
      [makeProgress("550e8400-e29b-41d4-a716-000000000004")],
      renderAll,
    );
    expect(rows[0]?.showTimestamp).toBe(false);
  });

  it("hides timestamp for queue-operation entries", () => {
    const rows = buildRenderableConversationRows(
      [makeQueueOperation("enqueue", "session-1", "2024-01-01T00:00:00.000Z")],
      renderAll,
    );
    expect(rows[0]?.showTimestamp).toBe(false);
  });

  it("hides timestamp for file-history-snapshot entries", () => {
    const rows = buildRenderableConversationRows([makeFileHistorySnapshot("msg-1")], renderAll);
    expect(rows[0]?.showTimestamp).toBe(false);
  });

  it("hides timestamp for custom-title entries", () => {
    const rows = buildRenderableConversationRows(
      [makeCustomTitle("session-1", "My Title")],
      renderAll,
    );
    expect(rows[0]?.showTimestamp).toBe(false);
  });

  it("hides timestamp for agent-name entries", () => {
    const rows = buildRenderableConversationRows(
      [makeAgentName("session-1", "my-agent")],
      renderAll,
    );
    expect(rows[0]?.showTimestamp).toBe(false);
  });

  it("always hides timestamp for x-error entries", () => {
    const rows = buildRenderableConversationRows([makeError(5)], renderAll);
    expect(rows[0]?.showTimestamp).toBe(false);
  });
});

describe("buildRenderableConversationRows - empty input", () => {
  it("returns empty array for empty conversations", () => {
    const rows = buildRenderableConversationRows([], () => true);
    expect(rows).toHaveLength(0);
  });

  it("returns empty array when all conversations are filtered out", () => {
    const rows = buildRenderableConversationRows(
      [
        makeUser("550e8400-e29b-41d4-a716-000000000001"),
        makeAssistant("550e8400-e29b-41d4-a716-000000000002"),
      ],
      () => false,
    );
    expect(rows).toHaveLength(0);
  });
});

describe("buildRenderableConversationRows - x-error bypasses shouldRenderConversation", () => {
  it("includes x-error entries even when shouldRenderConversation returns false", () => {
    const error = makeError(1);
    const rows = buildRenderableConversationRows([error], () => false);
    // x-error is always included regardless of filter
    expect(rows).toHaveLength(1);
    expect(rows[0]?.conversation.type).toBe("x-error");
  });

  it("excludes non-error entries when shouldRenderConversation returns false", () => {
    const user = makeUser("550e8400-e29b-41d4-a716-000000000001");
    const error = makeError(1);
    const rows = buildRenderableConversationRows([user, error], () => false);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.conversation.type).toBe("x-error");
  });
});

describe("buildRenderableConversationRows - duplicate key deduplication", () => {
  it("appends _1 suffix for second occurrence of same key", () => {
    // Two user entries with the same uuid would produce the same key.
    // In practice uuids are unique, but the queue-operation key depends on
    // (operation, sessionId, timestamp) which could be identical.
    const conv1 = makeQueueOperation("enqueue", "session-1", "2024-01-01T00:00:00.000Z");
    const conv2 = makeQueueOperation("enqueue", "session-1", "2024-01-01T00:00:00.000Z");
    const rows = buildRenderableConversationRows([conv1, conv2], () => true);

    expect(rows).toHaveLength(2);
    expect(rows[0]?.rowKey).toBe("queue-operation_enqueue_session-1_2024-01-01T00:00:00.000Z");
    expect(rows[1]?.rowKey).toBe("queue-operation_enqueue_session-1_2024-01-01T00:00:00.000Z_1");
  });

  it("appends _1, _2, _3 for triple occurrence of same key", () => {
    const conv = makeLastPrompt("session-1");
    const rows = buildRenderableConversationRows([conv, conv, conv], () => true);

    expect(rows).toHaveLength(3);
    expect(rows[0]?.rowKey).toBe("last-prompt_session-1");
    expect(rows[1]?.rowKey).toBe("last-prompt_session-1_1");
    expect(rows[2]?.rowKey).toBe("last-prompt_session-1_2");
  });

  it("deduplicates error keys independently from conversation keys", () => {
    const error1 = makeError(1);
    const error2 = makeError(1); // Same lineNumber → same key
    const rows = buildRenderableConversationRows([error1, error2], () => true);

    expect(rows).toHaveLength(2);
    expect(rows[0]?.rowKey).toBe("error_1");
    expect(rows[1]?.rowKey).toBe("error_1_1");
  });
});

describe("buildRenderableConversationRows - rowKey structure", () => {
  it("uses error_<lineNumber> format for x-error", () => {
    const rows = buildRenderableConversationRows([makeError(42)], () => true);
    expect(rows[0]?.rowKey).toBe("error_42");
  });

  it("uses getConversationKey result for non-error entries", () => {
    const uuid = "550e8400-e29b-41d4-a716-000000000099";
    const rows = buildRenderableConversationRows([makeUser(uuid)], () => true);
    expect(rows[0]?.rowKey).toBe(`user_${uuid}`);
  });
});
