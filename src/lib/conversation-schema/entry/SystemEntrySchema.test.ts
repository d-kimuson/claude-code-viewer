import { describe, expect, it } from "vitest";
import { SystemEntrySchema, ApiErrorSchema } from "./SystemEntrySchema";
import { ConversationSchema } from "../index";

describe("SystemEntrySchema", () => {
  describe("basic system entries", () => {
    it("validates basic system entry", () => {
      const basicSystemEntry = {
        type: "system" as const,
        content: "System message",
        toolUseID: "tool-123",
        level: "info" as const,
        isSidechain: false,
        userType: "external" as const,
        cwd: "/test",
        sessionId: "session-1",
        version: "1.0.0",
        uuid: "550e8400-e29b-41d4-a716-446655440000",
        timestamp: "2024-01-01T00:00:00.000Z",
        parentUuid: null,
      };

      const result = SystemEntrySchema.safeParse(basicSystemEntry);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe("system");
        expect(result.data.level).toBe("info");
        expect(result.data.content).toBe("System message");
      }
    });

    it("validates system entry with optional fields", () => {
      const systemEntryWithOptionals = {
        type: "system" as const,
        content: "System message with metadata",
        toolUseID: "tool-456",
        level: "info" as const,
        isSidechain: true,
        userType: "external" as const,
        cwd: "/test",
        sessionId: "session-1",
        version: "1.0.0",
        uuid: "550e8400-e29b-41d4-a716-446655440001",
        timestamp: "2024-01-01T00:00:00.000Z",
        parentUuid: "550e8400-e29b-41d4-a716-446655440099",
        gitBranch: "main",
        isMeta: false,
      };

      const result = SystemEntrySchema.safeParse(systemEntryWithOptionals);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isSidechain).toBe(true);
        expect(result.data.parentUuid).toBe(
          "550e8400-e29b-41d4-a716-446655440099",
        );
        expect(result.data.gitBranch).toBe("main");
      }
    });
  });

  describe("error system entries", () => {
    it("validates system entry with error level", () => {
      const errorSystemEntry = {
        type: "system" as const,
        content: "An error occurred",
        toolUseID: "tool-error",
        level: "error" as const,
        isSidechain: false,
        userType: "external" as const,
        cwd: "/test",
        sessionId: "session-1",
        version: "1.0.0",
        uuid: "550e8400-e29b-41d4-a716-446655440002",
        timestamp: "2024-01-01T00:00:00.000Z",
        parentUuid: null,
      };

      const result = SystemEntrySchema.safeParse(errorSystemEntry);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.level).toBe("error");
        expect(result.data.type).toBe("system");
      }
    });

    it("validates chutes provider error format", () => {
      const chutesErrorEntry = {
        type: "system" as const,
        content: "Error from provider(chutes,moonshotai/Kimi-K2-Thinking: 429)",
        toolUseID: "tool-chutes-error",
        level: "error" as const,
        subtype: "api_error",
        isSidechain: false,
        userType: "external" as const,
        cwd: "/Users/user/Repos/github.com/kierr/ai/.claude",
        sessionId: "263d9e55-0236-47b6-982a-1310aaed55fb",
        version: "2.0.37",
        gitBranch: "feature/observability-stack",
        uuid: "557bace0-24c2-49bb-9259-0db85fe1b5cd",
        timestamp: "2025-11-13T18:12:57.066Z",
        parentUuid: "e9f66ff7-25f1-4119-b18a-24e6594faadc",
        error: {
          status: 429,
          headers: {},
          requestID: null,
          error: {
            error: {
              message:
                'Error from provider(chutes,moonshotai/Kimi-K2-Thinking: 429): {"detail":"Infrastructure is at maximum capacity, try again later"}',
              type: "api_error",
              code: "provider_response_error",
            },
          },
        },
        retryInMs: 1018.7064670522191,
        retryAttempt: 2,
        maxRetries: 1000,
      };

      const result = SystemEntrySchema.safeParse(chutesErrorEntry);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.level).toBe("error");
        expect(result.data.subtype).toBe("api_error");
        expect(result.data.error?.status).toBe(429);
        expect(result.data.retryInMs).toBe(1018.7064670522191);
        expect(result.data.retryAttempt).toBe(2);
        expect(result.data.maxRetries).toBe(1000);
        expect(result.data.error?.error.error.message).toContain(
          "Infrastructure is at maximum capacity",
        );
      }
    });

    it("validates system entry with minimal error fields", () => {
      const minimalErrorEntry = {
        type: "system" as const,
        content: "Simple error",
        toolUseID: "tool-minimal-error",
        level: "error" as const,
        isSidechain: false,
        userType: "external" as const,
        cwd: "/test",
        sessionId: "session-1",
        version: "1.0.0",
        uuid: "550e8400-e29b-41d4-a716-446655440003",
        timestamp: "2024-01-01T00:00:00.000Z",
        parentUuid: null,
        error: {
          status: 500,
          headers: {},
          requestID: null,
          error: {
            error: {
              message: "Internal server error",
              type: "api_error",
              code: "internal_error",
            },
          },
        },
      };

      const result = SystemEntrySchema.safeParse(minimalErrorEntry);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.level).toBe("error");
        expect(result.data.error?.status).toBe(500);
        expect(result.data.error?.error.error.message).toBe(
          "Internal server error",
        );
      }
    });

    it("validates different error subtypes", () => {
      const subtypes = [
        "api_error",
        "timeout_error",
        "rate_limit_error",
        "authentication_error",
        "authorization_error",
        "validation_error",
        "internal_error",
        "provider_error",
      ];

      subtypes.forEach((subtype) => {
        const entry = {
          type: "system" as const,
          content: `Test ${subtype}`,
          toolUseID: "tool-test",
          level: "error" as const,
          subtype: subtype as any,
          isSidechain: false,
          userType: "external" as const,
          cwd: "/test",
          sessionId: "session-1",
          version: "1.0.0",
          uuid: "550e8400-e29b-41d4-a716-446655440010",
          timestamp: "2024-01-01T00:00:00.000Z",
          parentUuid: null,
        };

        const result = SystemEntrySchema.safeParse(entry);
        expect(result.success).toBe(true);
      });
    });
  });

  describe("validation failures", () => {
    it("fails when level is not info or error", () => {
      const invalidEntry = {
        type: "system" as const,
        content: "Test",
        toolUseID: "tool-123",
        level: "warning" as const, // Invalid level
        isSidechain: false,
        userType: "external" as const,
        cwd: "/test",
        sessionId: "session-1",
        version: "1.0.0",
        uuid: "550e8400-e29b-41d4-a716-446655440004",
        timestamp: "2024-01-01T00:00:00.000Z",
        parentUuid: null,
      };

      const result = SystemEntrySchema.safeParse(invalidEntry);

      expect(result.success).toBe(false);
    });

    it("fails when required fields are missing", () => {
      const incompleteEntry = {
        type: "system" as const,
        // Missing required fields: content, toolUseID
        level: "info" as const,
        isSidechain: false,
        userType: "external" as const,
        cwd: "/test",
        sessionId: "session-1",
        version: "1.0.0",
        uuid: "550e8400-e29b-41d4-a716-446655440005",
        timestamp: "2024-01-01T00:00:00.000Z",
        parentUuid: null,
      };

      const result = SystemEntrySchema.safeParse(incompleteEntry);

      expect(result.success).toBe(false);
    });

    it("fails when error object has invalid structure", () => {
      const invalidErrorEntry = {
        type: "system" as const,
        content: "Error test",
        toolUseID: "tool-error",
        level: "error" as const,
        isSidechain: false,
        userType: "external" as const,
        cwd: "/test",
        sessionId: "session-1",
        version: "1.0.0",
        uuid: "550e8400-e29b-41d4-a716-446655440006",
        timestamp: "2024-01-01T00:00:00.000Z",
        parentUuid: null,
        error: {
          status: "not a number", // Invalid type
          headers: {},
          requestID: null,
          error: {
            error: {
              message: "Test error",
              type: "api_error",
              code: "test_error",
            },
          },
        },
      };

      const result = SystemEntrySchema.safeParse(invalidErrorEntry);

      expect(result.success).toBe(false);
    });

    it("fails when subtype is not in allowed enum", () => {
      const invalidSubtypeEntry = {
        type: "system" as const,
        content: "Error test",
        toolUseID: "tool-error",
        level: "error" as const,
        subtype: "invalid_subtype" as const, // Not in enum
        isSidechain: false,
        userType: "external" as const,
        cwd: "/test",
        sessionId: "session-1",
        version: "1.0.0",
        uuid: "550e8400-e29b-41d4-a716-446655440007",
        timestamp: "2024-01-01T00:00:00.000Z",
        parentUuid: null,
      };

      const result = SystemEntrySchema.safeParse(invalidSubtypeEntry);

      expect(result.success).toBe(false);
    });
  });

  describe("integration with ConversationSchema", () => {
    it("validates system entry in ConversationSchema union", () => {
      const systemEntry = {
        type: "system" as const,
        content: "System message",
        toolUseID: "tool-123",
        level: "info" as const,
        isSidechain: false,
        userType: "external" as const,
        cwd: "/test",
        sessionId: "session-1",
        version: "1.0.0",
        uuid: "550e8400-e29b-41d4-a716-446655440008",
        timestamp: "2024-01-01T00:00:00.000Z",
        parentUuid: null,
      };

      const result = ConversationSchema.safeParse(systemEntry);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe("system");
      }
    });

    it("validates error system entry in ConversationSchema union", () => {
      const errorSystemEntry = {
        type: "system" as const,
        content: "Error occurred",
        toolUseID: "tool-error",
        level: "error" as const,
        subtype: "api_error",
        isSidechain: false,
        userType: "external" as const,
        cwd: "/test",
        sessionId: "session-1",
        version: "1.0.0",
        uuid: "550e8400-e29b-41d4-a716-446655440009",
        timestamp: "2024-01-01T00:00:00.000Z",
        parentUuid: null,
        error: {
          status: 500,
          headers: {},
          requestID: null,
          error: {
            error: {
              message: "Test error",
              type: "api_error",
              code: "test_error",
            },
          },
        },
      };

      const result = ConversationSchema.safeParse(errorSystemEntry);

      expect(result.success).toBe(true);
      if (result.success && result.data.type === "system") {
        expect(result.data.level).toBe("error");
      }
    });
  });

  describe("ApiErrorSchema standalone", () => {
    it("validates ApiErrorSchema independently", () => {
      const apiError = {
        status: 429,
        headers: { "Content-Type": "application/json" },
        requestID: "req-123",
        error: {
          error: {
            message: "Rate limit exceeded",
            type: "rate_limit_error",
            code: "rate_limit",
          },
        },
      };

      const result = ApiErrorSchema.safeParse(apiError);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe(429);
        expect(result.data.error.error.message).toBe("Rate limit exceeded");
      }
    });
  });

  describe("type inference", () => {
    it("correctly infers SystemEntry type", () => {
      const entry = {
        type: "system" as const,
        content: "Test content",
        toolUseID: "tool-123",
        level: "info" as const,
        isSidechain: false,
        userType: "external" as const,
        cwd: "/test",
        sessionId: "session-1",
        version: "1.0.0",
        uuid: "550e8400-e29b-41d4-a716-446655440011",
        timestamp: "2024-01-01T00:00:00.000Z",
        parentUuid: null,
      };

      const result = SystemEntrySchema.parse(entry);

      // TypeScript should infer these types correctly
      expect(result.type).toBe("system");
      expect(result.level).toBe("info");
      expect(result.content).toBe("Test content");
      expect(result.toolUseID).toBe("tool-123");
    });
  });
});
