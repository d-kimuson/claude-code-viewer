import type { Conversation } from "../../../../lib/conversation-schema/index.ts";
import type { ExtendedConversation } from "../../types.ts";
import { extractSearchableText } from "./extractSearchableText.ts";

// ---- helpers ----

const BASE = {
  isSidechain: false,
  userType: "external" as const,
  cwd: "/test",
  sessionId: "session-1",
  version: "1.0.0",
  parentUuid: null,
};

const makeSystem = (): Extract<Conversation, { type: "system" }> => ({
  ...BASE,
  type: "system",
  uuid: "550e8400-e29b-41d4-a716-446655440010",
  timestamp: "2024-01-01T00:00:00.000Z",
  subtype: undefined,
  content: "System log message",
  toolUseID: "tool-abc",
  level: "info",
});

const makeProgress = (): Extract<Conversation, { type: "progress" }> => ({
  ...BASE,
  type: "progress",
  uuid: "550e8400-e29b-41d4-a716-446655440011",
  timestamp: "2024-01-01T00:00:01.000Z",
  data: { step: 1 },
});

const makeQueueOperation = (): Extract<Conversation, { type: "queue-operation" }> => ({
  type: "queue-operation",
  operation: "enqueue",
  sessionId: "session-1",
  timestamp: "2024-01-01T00:00:02.000Z",
  content: "Queued user message",
});

const makeFileHistorySnapshot = (): Extract<Conversation, { type: "file-history-snapshot" }> => ({
  type: "file-history-snapshot",
  messageId: "msg-snap-1",
  snapshot: {
    messageId: "msg-snap-1",
    trackedFileBackups: {},
    timestamp: "2024-01-01T00:00:00.000Z",
  },
  isSnapshotUpdate: false,
});

const makePrLink = (): Extract<Conversation, { type: "pr-link" }> => ({
  type: "pr-link",
  sessionId: "session-1",
  prNumber: 42,
  prUrl: "https://github.com/org/repo/pull/42",
  prRepository: "org/repo",
  timestamp: "2024-01-01T00:00:00.000Z",
});

const makeLastPrompt = (): Extract<Conversation, { type: "last-prompt" }> => ({
  type: "last-prompt",
  sessionId: "session-1",
  lastPrompt: "What is the meaning of life?",
});

const makeAssistantWithNoTextContent = (): Extract<Conversation, { type: "assistant" }> => ({
  ...BASE,
  type: "assistant",
  uuid: "550e8400-e29b-41d4-a716-446655440020",
  timestamp: "2024-01-01T00:00:00.000Z",
  message: {
    id: "msg-empty",
    type: "message",
    role: "assistant",
    model: "claude-3-5-sonnet-20241022",
    // Only tool_use content, no text blocks
    content: [{ type: "tool_use", id: "tool-1", name: "bash", input: { command: "ls" } }],
    stop_reason: "tool_use",
    stop_sequence: null,
    usage: { input_tokens: 10, output_tokens: 5 },
  },
});

const makeAssistantWithEmptyContent = (): Extract<Conversation, { type: "assistant" }> => ({
  ...BASE,
  type: "assistant",
  uuid: "550e8400-e29b-41d4-a716-446655440021",
  timestamp: "2024-01-01T00:00:00.000Z",
  message: {
    id: "msg-truly-empty",
    type: "message",
    role: "assistant",
    model: "claude-3-5-sonnet-20241022",
    content: [],
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: { input_tokens: 0, output_tokens: 0 },
  },
});

const makeUserWithEmptyString = (): Extract<Conversation, { type: "user" }> => ({
  ...BASE,
  type: "user",
  uuid: "550e8400-e29b-41d4-a716-446655440030",
  timestamp: "2024-01-01T00:00:00.000Z",
  message: { role: "user", content: "" },
});

// ---- Tests ----

describe("extractSearchableText - types that should return null", () => {
  it("returns null for system type", () => {
    const result = extractSearchableText(makeSystem() as ExtendedConversation);
    expect(result).toBeNull();
  });

  it("returns null for progress type", () => {
    const result = extractSearchableText(makeProgress() as ExtendedConversation);
    expect(result).toBeNull();
  });

  it("returns null for queue-operation type", () => {
    const result = extractSearchableText(makeQueueOperation() as ExtendedConversation);
    expect(result).toBeNull();
  });

  it("returns null for file-history-snapshot type", () => {
    const result = extractSearchableText(makeFileHistorySnapshot() as ExtendedConversation);
    expect(result).toBeNull();
  });

  it("returns null for pr-link type", () => {
    const result = extractSearchableText(makePrLink() as ExtendedConversation);
    expect(result).toBeNull();
  });

  it("returns null for last-prompt type", () => {
    const result = extractSearchableText(makeLastPrompt() as ExtendedConversation);
    expect(result).toBeNull();
  });
});

describe("extractSearchableText - assistant edge cases", () => {
  it("returns empty string for assistant with only tool_use content (no text blocks)", () => {
    const result = extractSearchableText(makeAssistantWithNoTextContent() as ExtendedConversation);
    // extractAssistantText filters to text items only; empty filter = ""
    expect(result).toBe("");
  });

  it("returns empty string for assistant with truly empty content array", () => {
    const result = extractSearchableText(makeAssistantWithEmptyContent() as ExtendedConversation);
    expect(result).toBe("");
  });
});

describe("extractSearchableText - user edge cases", () => {
  it("returns empty string for user message with empty string content", () => {
    const result = extractSearchableText(makeUserWithEmptyString() as ExtendedConversation);
    // typeof content === "string" branch: returns the empty string
    expect(result).toBe("");
  });

  it("returns empty string for user message with array of only non-text items", () => {
    const conv: Extract<Conversation, { type: "user" }> = {
      ...BASE,
      type: "user",
      uuid: "550e8400-e29b-41d4-a716-446655440031",
      timestamp: "2024-01-01T00:00:00.000Z",
      message: {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: "image/png", data: "abc" },
          },
        ],
      },
    };
    const result = extractSearchableText(conv as ExtendedConversation);
    // All items filtered out, joined = ""
    expect(result).toBe("");
  });
});
