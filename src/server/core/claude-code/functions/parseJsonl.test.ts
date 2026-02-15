import { describe, expect, it } from "vitest";
import type { ErrorJsonl } from "../../types";
import { parseJsonl } from "./parseJsonl";

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
      const entry = result[0];
      if (entry && entry.type === "user") {
        expect(entry.message.content).toBe("Hello");
      }
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
      const entry = result[0];
      if (entry && entry.type === "summary") {
        expect(entry.summary).toBe("This is a summary");
      }
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
    it("無効なJSONを渡すとエラーを投げる", () => {
      const jsonl = "invalid json";

      // parseJsonl の実装は JSON.parse をそのまま呼び出すため、
      // 無効な JSON は例外を投げます
      expect(() => parseJsonl(jsonl)).toThrow();
    });

    it("スキーマに合わないオブジェクトをErrorJsonlとして返す", () => {
      const jsonl = JSON.stringify({
        type: "unknown",
        someField: "value",
      });

      const result = parseJsonl(jsonl);

      expect(result).toHaveLength(1);
      const errorEntry = result[0] as ErrorJsonl;
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
      const errorEntry = result[0] as ErrorJsonl;
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

      const errorEntry = result[1] as ErrorJsonl;
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
          parentUuid:
            i > 0
              ? `550e8400-e29b-41d4-a716-${String(i - 1).padStart(12, "0")}`
              : null,
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
      expect((result[1] as ErrorJsonl).lineNumber).toBe(2);
      expect((result[1] as ErrorJsonl).type).toBe("x-error");
      expect((result[3] as ErrorJsonl).lineNumber).toBe(4);
      expect((result[3] as ErrorJsonl).type).toBe("x-error");
    });

    it("空行フィルタ後の行番号が正確に記録される", () => {
      const jsonl = ["", "", JSON.stringify({ type: "invalid-schema" })].join(
        "\n",
      );

      const result = parseJsonl(jsonl);

      expect(result).toHaveLength(1);
      // 空行がフィルタされた後のインデックスは0だが、lineNumberは1として記録される
      expect((result[0] as ErrorJsonl).lineNumber).toBe(1);
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
      const entry = result[0];
      if (entry && entry.type === "custom-title") {
        expect(entry.customTitle).toBe("My Custom Name");
        expect(entry.sessionId).toBe("abc-123");
      }
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
      const entry = result[0];
      if (entry && entry.type === "agent-name") {
        expect(entry.agentName).toBe("claude-code-agent");
        expect(entry.sessionId).toBe("abc-123");
      }
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
      const entry = result[0];
      if (entry && entry.type === "user") {
        expect(entry.isSidechain).toBe(true);
        expect(entry.parentUuid).toBe("550e8400-e29b-41d4-a716-446655440099");
        expect(entry.gitBranch).toBe("main");
      }
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
      const entry = result[0];
      if (entry && entry.type === "user") {
        expect(entry.parentUuid).toBeNull();
      }
    });
  });
});
