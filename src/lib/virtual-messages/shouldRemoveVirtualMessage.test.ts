import { describe, expect, test } from "vitest";
import type { Conversation } from "@/lib/conversation-schema";
import { shouldRemoveVirtualMessage } from "./shouldRemoveVirtualMessage";

// Minimal helper to create a user-type conversation entry for testing.
// Only the fields relevant to shouldRemoveVirtualMessage are needed,
// but we provide a full shape to satisfy the Conversation type.
const makeUserConversation = (timestamp: string): Conversation => ({
  type: "user",
  message: { role: "user", content: "test" },
  isSidechain: false,
  userType: "external",
  cwd: "/tmp",
  sessionId: "s1",
  version: "1.0.0",
  uuid: "00000000-0000-0000-0000-000000000001",
  timestamp,
  parentUuid: null,
});

const makeAssistantConversation = (timestamp: string): Conversation => ({
  type: "assistant",
  message: {
    id: "msg-001",
    type: "message",
    role: "assistant",
    model: "claude-3-5-sonnet-20241022",
    content: [],
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: {
      input_tokens: 0,
      output_tokens: 0,
    },
  },
  isSidechain: false,
  userType: "external",
  cwd: "/tmp",
  sessionId: "s1",
  version: "1.0.0",
  uuid: "00000000-0000-0000-0000-000000000002",
  timestamp,
  parentUuid: null,
});

describe("shouldRemoveVirtualMessage", () => {
  const sentAt = "2024-06-15T12:30:00.000Z";

  test("returns false when conversations array is empty", () => {
    expect(shouldRemoveVirtualMessage([], sentAt)).toBe(false);
  });

  test("returns false when no user messages exist", () => {
    const conversations = [makeAssistantConversation("2024-06-15T12:31:00.000Z")];
    expect(shouldRemoveVirtualMessage(conversations, sentAt)).toBe(false);
  });

  test("returns false when user message is before sentAt", () => {
    const conversations = [makeUserConversation("2024-06-15T12:29:00.000Z")];
    expect(shouldRemoveVirtualMessage(conversations, sentAt)).toBe(false);
  });

  test("returns true when user message timestamp equals sentAt", () => {
    const conversations = [makeUserConversation(sentAt)];
    expect(shouldRemoveVirtualMessage(conversations, sentAt)).toBe(true);
  });

  test("returns true when user message is after sentAt", () => {
    const conversations = [makeUserConversation("2024-06-15T12:31:00.000Z")];
    expect(shouldRemoveVirtualMessage(conversations, sentAt)).toBe(true);
  });

  test("returns true when at least one user message is >= sentAt among many", () => {
    const conversations = [
      makeUserConversation("2024-06-15T12:00:00.000Z"),
      makeAssistantConversation("2024-06-15T12:15:00.000Z"),
      makeUserConversation("2024-06-15T12:35:00.000Z"),
    ];
    expect(shouldRemoveVirtualMessage(conversations, sentAt)).toBe(true);
  });

  test("returns false when all user messages are before sentAt", () => {
    const conversations = [
      makeUserConversation("2024-06-15T12:00:00.000Z"),
      makeUserConversation("2024-06-15T12:20:00.000Z"),
      makeAssistantConversation("2024-06-15T12:35:00.000Z"),
    ];
    expect(shouldRemoveVirtualMessage(conversations, sentAt)).toBe(false);
  });
});
