import type { Conversation } from "../../../../lib/conversation-schema";
import { extractSearchableText } from "./extractSearchableText";

type UserConversation = Extract<Conversation, { type: "user" }>;

const createUserConversation = (
  content: UserConversation["message"]["content"],
): UserConversation => ({
  type: "user",
  uuid: "550e8400-e29b-41d4-a716-446655440000",
  timestamp: "2024-01-01T00:00:00.000Z",
  message: { role: "user", content },
  isSidechain: false,
  userType: "external",
  cwd: "/test",
  sessionId: "session-1",
  version: "1.0.0",
  parentUuid: null,
});

const createAssistantConversation = (
  content: Extract<Conversation, { type: "assistant" }>["message"]["content"],
): Extract<Conversation, { type: "assistant" }> => ({
  type: "assistant",
  uuid: "550e8400-e29b-41d4-a716-446655440001",
  timestamp: "2024-01-01T00:00:00.000Z",
  parentUuid: "550e8400-e29b-41d4-a716-446655440000",
  isSidechain: false,
  userType: "external",
  cwd: "/test",
  sessionId: "session-1",
  version: "1.0.0",
  message: {
    id: "msg-1",
    type: "message",
    role: "assistant",
    model: "claude-3-opus",
    content,
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: { input_tokens: 10, output_tokens: 20 },
  },
});

describe("extractSearchableText", () => {
  describe("user messages", () => {
    it("extracts text from simple string content", () => {
      const conversation = createUserConversation("Hello, world!");

      const result = extractSearchableText(conversation);
      expect(result).toBe("Hello, world!");
    });

    it("extracts text from array content with text items", () => {
      const conversation = createUserConversation([
        { type: "text", text: "First part" },
        { type: "text", text: "Second part" },
      ]);

      const result = extractSearchableText(conversation);
      expect(result).toBe("First part Second part");
    });

    it("extracts text from array content with string items", () => {
      const conversation = createUserConversation(["Hello", "World"]);

      const result = extractSearchableText(conversation);
      expect(result).toBe("Hello World");
    });

    it("filters out non-text items from array content", () => {
      const conversation = createUserConversation([
        { type: "text", text: "Text content" },
        {
          type: "image",
          source: { type: "base64", media_type: "image/png", data: "abc" },
        },
      ]);

      const result = extractSearchableText(conversation);
      expect(result).toBe("Text content");
    });
  });

  describe("assistant messages", () => {
    it("extracts text from assistant response", () => {
      const conversation = createAssistantConversation([
        { type: "text", text: "This is my response" },
      ]);

      const result = extractSearchableText(conversation);
      expect(result).toBe("This is my response");
    });

    it("concatenates multiple text blocks", () => {
      const conversation = createAssistantConversation([
        { type: "text", text: "First paragraph" },
        { type: "text", text: "Second paragraph" },
      ]);

      const result = extractSearchableText(conversation);
      expect(result).toBe("First paragraph Second paragraph");
    });

    it("filters out tool_use blocks", () => {
      const conversation = createAssistantConversation([
        { type: "text", text: "Let me help you" },
        { type: "tool_use", id: "tool-1", name: "bash", input: {} },
        { type: "text", text: "Done!" },
      ]);

      const result = extractSearchableText(conversation);
      expect(result).toBe("Let me help you Done!");
    });
  });

  describe("custom-title and agent-name entries", () => {
    it("returns customTitle string for custom-title entries", () => {
      const conversation: Conversation = {
        type: "custom-title",
        customTitle: "My Custom Session Name",
        sessionId: "abc-123",
      };

      const result = extractSearchableText(conversation);
      expect(result).toBe("My Custom Session Name");
    });

    it("returns null for agent-name entries", () => {
      const conversation: Conversation = {
        type: "agent-name",
        agentName: "claude-code-agent",
        sessionId: "abc-123",
      };

      const result = extractSearchableText(conversation);
      expect(result).toBeNull();
    });
  });

  describe("unsupported types", () => {
    it("returns null for x-error type", () => {
      const conversation = {
        type: "x-error" as const,
        line: "invalid json",
        lineNumber: 1,
      };

      const result = extractSearchableText(conversation);
      expect(result).toBeNull();
    });

    it("returns null for summary type", () => {
      const conversation: Conversation = {
        type: "summary",
        summary: "A summary of the conversation",
        leafUuid: "550e8400-e29b-41d4-a716-446655440000",
      };

      const result = extractSearchableText(conversation);
      expect(result).toBeNull();
    });
  });
});
