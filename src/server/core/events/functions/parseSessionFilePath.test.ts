import { describe, expect, it } from "vitest";
import { parseSessionFilePath } from "./parseSessionFilePath";

describe("parseSessionFilePath", () => {
  describe("regular session files", () => {
    it("parses simple session file path", () => {
      const result = parseSessionFilePath("project-name/session-id.jsonl");
      expect(result).toEqual({
        type: "session",
        projectId: "project-name",
        sessionId: "session-id",
      });
    });

    it("parses session file with UUID-like session ID", () => {
      const result = parseSessionFilePath(
        "my-project/550e8400-e29b-41d4-a716-446655440000.jsonl",
      );
      expect(result).toEqual({
        type: "session",
        projectId: "my-project",
        sessionId: "550e8400-e29b-41d4-a716-446655440000",
      });
    });

    it("parses session file with nested path (non-greedy first match)", () => {
      // The regex is non-greedy, so it matches the first slash
      // In practice, the projectId is just the first directory component
      // The encodeProjectIdFromSessionFilePath function handles proper encoding
      const result = parseSessionFilePath(
        "home/user/projects/my-app/session123.jsonl",
      );
      expect(result).toEqual({
        type: "session",
        projectId: "home",
        sessionId: "user/projects/my-app/session123",
      });
    });
  });

  describe("agent session files", () => {
    it("parses agent file with simple hash", () => {
      const result = parseSessionFilePath("project-name/agent-abc123.jsonl");
      expect(result).toEqual({
        type: "agent",
        projectId: "project-name",
        agentSessionId: "abc123",
      });
    });

    it("parses agent file with UUID-like hash", () => {
      const result = parseSessionFilePath(
        "my-project/agent-550e8400-e29b-41d4-a716-446655440000.jsonl",
      );
      expect(result).toEqual({
        type: "agent",
        projectId: "my-project",
        agentSessionId: "550e8400-e29b-41d4-a716-446655440000",
      });
    });

    it("parses agent file with nested path (greedy match for projectId)", () => {
      // For agent files, the regex matches everything before /agent-
      // This correctly captures the full project path
      const result = parseSessionFilePath(
        "home/user/projects/my-app/agent-def456.jsonl",
      );
      expect(result).toEqual({
        type: "agent",
        projectId: "home/user/projects/my-app",
        agentSessionId: "def456",
      });
    });
  });

  describe("non-matching files", () => {
    it("returns null for non-jsonl files", () => {
      expect(parseSessionFilePath("project/session.json")).toBeNull();
    });

    it("returns null for directories", () => {
      expect(parseSessionFilePath("project/session")).toBeNull();
    });

    it("returns null for empty string", () => {
      expect(parseSessionFilePath("")).toBeNull();
    });

    it("returns null for jsonl file without directory", () => {
      // Path must have at least one directory separator
      expect(parseSessionFilePath("session.jsonl")).toBeNull();
    });
  });

  describe("edge cases", () => {
    it("handles project name containing 'agent' but not as prefix", () => {
      // my-agent-project/session.jsonl should be a session file
      const result = parseSessionFilePath("my-agent-project/session-id.jsonl");
      expect(result).toEqual({
        type: "session",
        projectId: "my-agent-project",
        sessionId: "session-id",
      });
    });

    it("correctly identifies agent- prefix at filename level, not path level", () => {
      // agent-project/session.jsonl - the agent- is in directory, not filename
      const result = parseSessionFilePath("agent-project/session-id.jsonl");
      expect(result).toEqual({
        type: "session",
        projectId: "agent-project",
        sessionId: "session-id",
      });
    });

    it("agent file in agent-prefixed directory", () => {
      // agent-project/agent-hash.jsonl
      const result = parseSessionFilePath("agent-project/agent-abc123.jsonl");
      expect(result).toEqual({
        type: "agent",
        projectId: "agent-project",
        agentSessionId: "abc123",
      });
    });
  });
});
