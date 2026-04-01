import { describe, expect, it } from "vitest";
import type { ErrorJsonl, ExtendedConversation } from "../../types.ts";
import { parseJsonl } from "./parseJsonl.ts";

type UserEntry = Extract<ExtendedConversation, { type: "user" }>;
type SummaryEntry = Extract<ExtendedConversation, { type: "summary" }>;
type CustomTitleEntry = Extract<ExtendedConversation, { type: "custom-title" }>;
type AgentNameEntry = Extract<ExtendedConversation, { type: "agent-name" }>;
type PrLinkEntry = Extract<ExtendedConversation, { type: "pr-link" }>;
type LastPromptEntry = Extract<ExtendedConversation, { type: "last-prompt" }>;

const expectUserEntry = (entry: ExtendedConversation | undefined): UserEntry => {
  expect(entry?.type).toBe("user");
  if (entry?.type !== "user") {
    throw new Error("Expected user entry");
  }
  return entry;
};

const expectSummaryEntry = (entry: ExtendedConversation | undefined): SummaryEntry => {
  expect(entry?.type).toBe("summary");
  if (entry?.type !== "summary") {
    throw new Error("Expected summary entry");
  }
  return entry;
};

const expectCustomTitleEntry = (entry: ExtendedConversation | undefined): CustomTitleEntry => {
  expect(entry?.type).toBe("custom-title");
  if (entry?.type !== "custom-title") {
    throw new Error("Expected custom-title entry");
  }
  return entry;
};

const expectAgentNameEntry = (entry: ExtendedConversation | undefined): AgentNameEntry => {
  expect(entry?.type).toBe("agent-name");
  if (entry?.type !== "agent-name") {
    throw new Error("Expected agent-name entry");
  }
  return entry;
};

const expectPrLinkEntry = (entry: ExtendedConversation | undefined): PrLinkEntry => {
  expect(entry?.type).toBe("pr-link");
  if (entry?.type !== "pr-link") {
    throw new Error("Expected pr-link entry");
  }
  return entry;
};

const expectLastPromptEntry = (entry: ExtendedConversation | undefined): LastPromptEntry => {
  expect(entry?.type).toBe("last-prompt");
  if (entry?.type !== "last-prompt") {
    throw new Error("Expected last-prompt entry");
  }
  return entry;
};

const expectErrorEntry = (entry: ExtendedConversation | undefined): ErrorJsonl => {
  expect(entry?.type).toBe("x-error");
  if (entry?.type !== "x-error") {
    throw new Error("Expected x-error entry");
  }
  return entry;
};

describe("parseJsonl", () => {
  describe("正常系: 有効なJSONLをパースできる", () => {
    it("単一のUserエントリをパースできる", () => {
      const jsonl = JSON.stringify({
        type: "user",
        uuid: "550e8400-e29b-41d4-a716-446655440000",
        timestamp: "2024-01-01T00:00:00.000Z",
        message: { role: "user", content: "Hello" },
        isSidechain: false,
        userType: "external",
        cwd: "/test",
        sessionId: "session-1",
        version: "1.0.0",
        parentUuid: null,
      });

      const result = parseJsonl(jsonl);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty("type", "user");
      const entry = expectUserEntry(result[0]);
      expect(entry.message.content).toBe("Hello");
    });

    it("単一のSummaryエントリをパースできる", () => {
      const jsonl = JSON.stringify({
        type: "summary",
        summary: "This is a summary",
        leafUuid: "550e8400-e29b-41d4-a716-446655440003",
      });

      const result = parseJsonl(jsonl);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty("type", "summary");
      const entry = expectSummaryEntry(result[0]);
      expect(entry.summary).toBe("This is a summary");
    });

    it("複数のエントリをパースできる", () => {
      const jsonl = [
        JSON.stringify({
          type: "user",
          uuid: "550e8400-e29b-41d4-a716-446655440000",
          timestamp: "2024-01-01T00:00:00.000Z",
          message: { role: "user", content: "Hello" },
          isSidechain: false,
          userType: "external",
          cwd: "/test",
          sessionId: "session-1",
          version: "1.0.0",
          parentUuid: null,
        }),
        JSON.stringify({
          type: "summary",
          summary: "Test summary",
          leafUuid: "550e8400-e29b-41d4-a716-446655440002",
        }),
      ].join("\n");

      const result = parseJsonl(jsonl);

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty("type", "user");
      expect(result[1]).toHaveProperty("type", "summary");
    });
  });

  describe("エラー系: 不正なJSON行をErrorJsonlとして返す", () => {
    it("無効なJSONをErrorJsonlとして返す（例外を投げない）", () => {
      const jsonl = "invalid json";

      // parseJsonl は無効な JSON に対して例外を投げず、ErrorJsonl を返します
      const result = parseJsonl(jsonl);

      expect(result).toHaveLength(1);
      const errorEntry = expectErrorEntry(result[0]);
      expect(errorEntry.type).toBe("x-error");
      expect(errorEntry.lineNumber).toBe(1);
    });

    it("スキーマに合わないオブジェクトをErrorJsonlとして返す", () => {
      const jsonl = JSON.stringify({
        type: "unknown",
        someField: "value",
      });

      const result = parseJsonl(jsonl);

      expect(result).toHaveLength(1);
      const errorEntry = expectErrorEntry(result[0]);
      expect(errorEntry.type).toBe("x-error");
      expect(errorEntry.lineNumber).toBe(1);
    });

    it("必須フィールドが欠けているエントリをErrorJsonlとして返す", () => {
      const jsonl = JSON.stringify({
        type: "user",
        uuid: "550e8400-e29b-41d4-a716-446655440000",
        // timestamp, message などの必須フィールドが欠けている
      });

      const result = parseJsonl(jsonl);

      expect(result).toHaveLength(1);
      const errorEntry = expectErrorEntry(result[0]);
      expect(errorEntry.type).toBe("x-error");
      expect(errorEntry.lineNumber).toBe(1);
    });

    it("正常なエントリとエラーエントリを混在して返す", () => {
      const jsonl = [
        JSON.stringify({
          type: "user",
          uuid: "550e8400-e29b-41d4-a716-446655440000",
          timestamp: "2024-01-01T00:00:00.000Z",
          message: { role: "user", content: "Hello" },
          isSidechain: false,
          userType: "external",
          cwd: "/test",
          sessionId: "session-1",
          version: "1.0.0",
          parentUuid: null,
        }),
        JSON.stringify({ type: "invalid-schema" }),
        JSON.stringify({
          type: "summary",
          summary: "Summary text",
          leafUuid: "550e8400-e29b-41d4-a716-446655440001",
        }),
      ].join("\n");

      const result = parseJsonl(jsonl);

      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty("type", "user");
      expect(result[1]).toHaveProperty("type", "x-error");
      expect(result[2]).toHaveProperty("type", "summary");

      const errorEntry = expectErrorEntry(result[1]);
      expect(errorEntry.lineNumber).toBe(2);
    });
  });

  describe("エッジケース: 空行、トリム、複数エントリ", () => {
    it("空文字列を渡すと空配列を返す", () => {
      const result = parseJsonl("");

      expect(result).toEqual([]);
    });

    it("空行のみを渡すと空配列を返す", () => {
      const result = parseJsonl("\n\n\n");

      expect(result).toEqual([]);
    });

    it("前後の空白をトリムする", () => {
      const jsonl = `  
        ${JSON.stringify({
          type: "user",
          uuid: "550e8400-e29b-41d4-a716-446655440000",
          timestamp: "2024-01-01T00:00:00.000Z",
          message: { role: "user", content: "Hello" },
          isSidechain: false,
          userType: "external",
          cwd: "/test",
          sessionId: "session-1",
          version: "1.0.0",
          parentUuid: null,
        })}
        `;

      const result = parseJsonl(jsonl);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty("type", "user");
    });

    it("行間の空行を除外する", () => {
      const jsonl = [
        JSON.stringify({
          type: "user",
          uuid: "550e8400-e29b-41d4-a716-446655440000",
          timestamp: "2024-01-01T00:00:00.000Z",
          message: { role: "user", content: "Hello" },
          isSidechain: false,
          userType: "external",
          cwd: "/test",
          sessionId: "session-1",
          version: "1.0.0",
          parentUuid: null,
        }),
        "",
        "",
        JSON.stringify({
          type: "summary",
          summary: "Summary text",
          leafUuid: "550e8400-e29b-41d4-a716-446655440001",
        }),
      ].join("\n");

      const result = parseJsonl(jsonl);

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty("type", "user");
      expect(result[1]).toHaveProperty("type", "summary");
    });

    it("空白のみの行を除外する", () => {
      const jsonl = [
        JSON.stringify({
          type: "user",
          uuid: "550e8400-e29b-41d4-a716-446655440000",
          timestamp: "2024-01-01T00:00:00.000Z",
          message: { role: "user", content: "Hello" },
          isSidechain: false,
          userType: "external",
          cwd: "/test",
          sessionId: "session-1",
          version: "1.0.0",
          parentUuid: null,
        }),
        "   ",
        "\t",
        JSON.stringify({
          type: "summary",
          summary: "Summary text",
          leafUuid: "550e8400-e29b-41d4-a716-446655440001",
        }),
      ].join("\n");

      const result = parseJsonl(jsonl);

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty("type", "user");
      expect(result[1]).toHaveProperty("type", "summary");
    });

    it("多数のエントリを含むJSONLをパースできる", () => {
      const entries = Array.from({ length: 100 }, (_, i) => {
        return JSON.stringify({
          type: "user",
          uuid: `550e8400-e29b-41d4-a716-${String(i).padStart(12, "0")}`,
          timestamp: new Date(Date.UTC(2024, 0, 1, 0, 0, i)).toISOString(),
          message: {
            role: "user",
            content: `Message ${i}`,
          },
          isSidechain: false,
          userType: "external",
          cwd: "/test",
          sessionId: "session-1",
          version: "1.0.0",
          parentUuid: i > 0 ? `550e8400-e29b-41d4-a716-${String(i - 1).padStart(12, "0")}` : null,
        });
      });

      const jsonl = entries.join("\n");
      const result = parseJsonl(jsonl);

      expect(result).toHaveLength(100);
      expect(result.every((entry) => entry.type === "user")).toBe(true);
    });
  });

  describe("行番号の正確性", () => {
    it("スキーマ検証エラー時の行番号が正確に記録される", () => {
      const jsonl = [
        JSON.stringify({
          type: "user",
          uuid: "550e8400-e29b-41d4-a716-446655440000",
          timestamp: "2024-01-01T00:00:00.000Z",
          message: { role: "user", content: "Line 1" },
          isSidechain: false,
          userType: "external",
          cwd: "/test",
          sessionId: "session-1",
          version: "1.0.0",
          parentUuid: null,
        }),
        JSON.stringify({ type: "invalid", data: "schema error" }),
        JSON.stringify({
          type: "user",
          uuid: "550e8400-e29b-41d4-a716-446655440001",
          timestamp: "2024-01-01T00:00:01.000Z",
          message: { role: "user", content: "Line 3" },
          isSidechain: false,
          userType: "external",
          cwd: "/test",
          sessionId: "session-1",
          version: "1.0.0",
          parentUuid: null,
        }),
        JSON.stringify({ type: "another-invalid" }),
      ].join("\n");

      const result = parseJsonl(jsonl);

      expect(result).toHaveLength(4);
      expect(expectErrorEntry(result[1]).lineNumber).toBe(2);
      expect(expectErrorEntry(result[1]).type).toBe("x-error");
      expect(expectErrorEntry(result[3]).lineNumber).toBe(4);
      expect(expectErrorEntry(result[3]).type).toBe("x-error");
    });

    it("空行フィルタ後の行番号が正確に記録される", () => {
      const jsonl = ["", "", JSON.stringify({ type: "invalid-schema" })].join("\n");

      const result = parseJsonl(jsonl);

      expect(result).toHaveLength(1);
      // 空行がフィルタされた後のインデックスは0だが、lineNumberは1として記録される
      expect(expectErrorEntry(result[0]).lineNumber).toBe(1);
    });
  });

  describe("custom-title and agent-name entries", () => {
    it("custom-title entry parses correctly", () => {
      const jsonl = JSON.stringify({
        type: "custom-title",
        customTitle: "My Custom Name",
        sessionId: "abc-123",
      });

      const result = parseJsonl(jsonl);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty("type", "custom-title");
      const entry = expectCustomTitleEntry(result[0]);
      expect(entry.customTitle).toBe("My Custom Name");
      expect(entry.sessionId).toBe("abc-123");
    });

    it("agent-name entry parses correctly", () => {
      const jsonl = JSON.stringify({
        type: "agent-name",
        agentName: "claude-code-agent",
        sessionId: "abc-123",
      });

      const result = parseJsonl(jsonl);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty("type", "agent-name");
      const entry = expectAgentNameEntry(result[0]);
      expect(entry.agentName).toBe("claude-code-agent");
      expect(entry.sessionId).toBe("abc-123");
    });

    it("both types mixed with regular entries parse without x-error", () => {
      const jsonl = [
        JSON.stringify({
          type: "user",
          uuid: "550e8400-e29b-41d4-a716-446655440000",
          timestamp: "2024-01-01T00:00:00.000Z",
          message: { role: "user", content: "Hello" },
          isSidechain: false,
          userType: "external",
          cwd: "/test",
          sessionId: "session-1",
          version: "1.0.0",
          parentUuid: null,
        }),
        JSON.stringify({
          type: "custom-title",
          customTitle: "My Session",
          sessionId: "session-1",
        }),
        JSON.stringify({
          type: "agent-name",
          agentName: "claude-code-agent",
          sessionId: "session-1",
        }),
        JSON.stringify({
          type: "summary",
          summary: "Summary text",
          leafUuid: "550e8400-e29b-41d4-a716-446655440001",
        }),
      ].join("\n");

      const result = parseJsonl(jsonl);

      expect(result).toHaveLength(4);
      expect(result[0]).toHaveProperty("type", "user");
      expect(result[1]).toHaveProperty("type", "custom-title");
      expect(result[2]).toHaveProperty("type", "agent-name");
      expect(result[3]).toHaveProperty("type", "summary");
      // No x-error entries
      expect(result.every((entry) => entry.type !== "x-error")).toBe(true);
    });
  });

  describe("pr-link and last-prompt entries", () => {
    it("pr-link entry parses correctly", () => {
      const jsonl = JSON.stringify({
        type: "pr-link",
        sessionId: "28fc793f-fbe6-4062-8b4a-3d6e28f65b8b",
        prNumber: 167,
        prUrl: "https://github.com/d-kimuson/claude-code-viewer/pull/167",
        prRepository: "d-kimuson/claude-code-viewer",
        timestamp: "2026-03-30T19:16:39.642Z",
      });

      const result = parseJsonl(jsonl);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty("type", "pr-link");
      const entry = expectPrLinkEntry(result[0]);
      expect(entry.prNumber).toBe(167);
      expect(entry.prUrl).toBe("https://github.com/d-kimuson/claude-code-viewer/pull/167");
      expect(entry.prRepository).toBe("d-kimuson/claude-code-viewer");
    });

    it("last-prompt entry parses correctly", () => {
      const jsonl = JSON.stringify({
        type: "last-prompt",
        lastPrompt: "Read docs/2026-03-12-phase-2-raise-only-hires.md...",
        sessionId: "28fc793f-fbe6-4062-8b4a-3d6e28f65b8b",
      });

      const result = parseJsonl(jsonl);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty("type", "last-prompt");
      const entry = expectLastPromptEntry(result[0]);
      expect(entry.lastPrompt).toBe("Read docs/2026-03-12-phase-2-raise-only-hires.md...");
    });

    it("pr-link and last-prompt mixed with regular entries parse without x-error", () => {
      const jsonl = [
        JSON.stringify({
          type: "user",
          uuid: "550e8400-e29b-41d4-a716-446655440000",
          timestamp: "2024-01-01T00:00:00.000Z",
          message: { role: "user", content: "Hello" },
          isSidechain: false,
          userType: "external",
          cwd: "/test",
          sessionId: "session-1",
          version: "1.0.0",
          parentUuid: null,
        }),
        JSON.stringify({
          type: "pr-link",
          sessionId: "session-1",
          prNumber: 167,
          prUrl: "https://github.com/d-kimuson/claude-code-viewer/pull/167",
          prRepository: "d-kimuson/claude-code-viewer",
          timestamp: "2026-03-30T19:16:39.642Z",
        }),
        JSON.stringify({
          type: "last-prompt",
          lastPrompt: "Some prompt text",
          sessionId: "session-1",
        }),
        JSON.stringify({
          type: "summary",
          summary: "Summary text",
          leafUuid: "550e8400-e29b-41d4-a716-446655440001",
        }),
      ].join("\n");

      const result = parseJsonl(jsonl);

      expect(result).toHaveLength(4);
      expect(result[0]).toHaveProperty("type", "user");
      expect(result[1]).toHaveProperty("type", "pr-link");
      expect(result[2]).toHaveProperty("type", "last-prompt");
      expect(result[3]).toHaveProperty("type", "summary");
      // No x-error entries
      expect(result.every((entry) => entry.type !== "x-error")).toBe(true);
    });
  });

  describe("ConversationSchemaのバリエーション", () => {
    it("オプショナルフィールドを含むUserエントリをパースできる", () => {
      const jsonl = JSON.stringify({
        type: "user",
        uuid: "550e8400-e29b-41d4-a716-446655440000",
        timestamp: "2024-01-01T00:00:00.000Z",
        message: { role: "user", content: "Hello" },
        isSidechain: true,
        userType: "external",
        cwd: "/test",
        sessionId: "session-1",
        version: "1.0.0",
        parentUuid: "550e8400-e29b-41d4-a716-446655440099",
        gitBranch: "main",
        isMeta: false,
      });

      const result = parseJsonl(jsonl);

      expect(result).toHaveLength(1);
      const entry = expectUserEntry(result[0]);
      expect(entry.isSidechain).toBe(true);
      expect(entry.parentUuid).toBe("550e8400-e29b-41d4-a716-446655440099");
      expect(entry.gitBranch).toBe("main");
    });

    it("nullableフィールドがnullのエントリをパースできる", () => {
      const jsonl = JSON.stringify({
        type: "user",
        uuid: "550e8400-e29b-41d4-a716-446655440000",
        timestamp: "2024-01-01T00:00:00.000Z",
        message: { role: "user", content: "Hello" },
        isSidechain: false,
        userType: "external",
        cwd: "/test",
        sessionId: "session-1",
        version: "1.0.0",
        parentUuid: null,
      });

      const result = parseJsonl(jsonl);

      expect(result).toHaveLength(1);
      const entry = expectUserEntry(result[0]);
      expect(entry.parentUuid).toBeNull();
    });
  });
});
