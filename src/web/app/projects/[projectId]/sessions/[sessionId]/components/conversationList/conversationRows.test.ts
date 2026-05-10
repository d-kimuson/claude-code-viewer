import { describe, expect, it } from "vitest";
import type { Conversation } from "@/lib/conversation-schema";
import type { ErrorJsonl } from "@/server/core/types";
import { buildRenderableConversationRows, getConversationKey } from "./conversationRows";

type UserConversation = Extract<Conversation, { type: "user" }>;
type QueueOperationConversation = Extract<Conversation, { type: "queue-operation" }>;

const createUserConversation = (uuid: string): UserConversation => ({
  type: "user",
  uuid,
  timestamp: "2024-01-01T00:00:00.000Z",
  message: { role: "user", content: "hello" },
  isSidechain: false,
  userType: "external",
  cwd: "/tmp",
  sessionId: "session-1",
  version: "1.0.0",
  parentUuid: null,
});

const createQueueOperationConversation = (): QueueOperationConversation => ({
  type: "queue-operation",
  operation: "dequeue",
  sessionId: "session-1",
  timestamp: "2024-01-01T00:00:02.000Z",
});

const createSchemaErrorConversation = (): ErrorJsonl => ({
  type: "x-error",
  line: "{ invalid json",
  lineNumber: 7,
});

describe("conversationRows", () => {
  it("builds renderable rows while preserving schema errors", () => {
    const schemaError = createSchemaErrorConversation();
    const userConversation = createUserConversation("550e8400-e29b-41d4-a716-446655440000");
    const customTitleConversation: Conversation = {
      type: "custom-title",
      customTitle: "Session title",
      sessionId: "session-1",
    };

    const rows = buildRenderableConversationRows(
      [schemaError, userConversation, customTitleConversation],
      (conversation) => conversation.type !== "user",
    );

    expect(rows).toHaveLength(2);
    expect(rows[0]?.rowKey).toBe("error_7");
    expect(rows[0]?.conversation.type).toBe("x-error");
    expect(rows[1]?.rowKey).toBe("custom-title_session-1_Session title");
  });

  it("sets timestamp visibility by conversation type", () => {
    const userConversation = createUserConversation("550e8400-e29b-41d4-a716-446655440001");
    const queueConversation = createQueueOperationConversation();

    const aiTitleConversation: Conversation = {
      type: "ai-title",
      aiTitle: "AI title",
      sessionId: "session-1",
    };

    const rows = buildRenderableConversationRows(
      [userConversation, queueConversation, aiTitleConversation],
      () => true,
    );

    expect(rows).toHaveLength(3);
    expect(rows[0]?.showTimestamp).toBe(true);
    expect(rows[1]?.showTimestamp).toBe(false);
    expect(rows[2]?.showTimestamp).toBe(false);
  });

  it("generates stable keys for conversation entries", () => {
    const userConversation = createUserConversation("550e8400-e29b-41d4-a716-446655440002");

    const aiTitleConversation: Conversation = {
      type: "ai-title",
      aiTitle: "AI title",
      sessionId: "session-1",
    };

    expect(getConversationKey(userConversation)).toBe("user_550e8400-e29b-41d4-a716-446655440002");
    expect(getConversationKey(aiTitleConversation)).toBe("ai-title_session-1_AI title");
  });
});
