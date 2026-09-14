import { describe, expect, test } from "vitest";
import { KNOWN_SYSTEM_SUBTYPES, SystemEntrySchema } from "./SystemEntrySchema.ts";

describe("SystemEntrySchema", () => {
  describe("turn_duration subtype", () => {
    test("accepts valid turn_duration entry", () => {
      const result = SystemEntrySchema.safeParse({
        parentUuid: "be2d3283-d532-4771-9106-737788998164",
        isSidechain: false,
        userType: "external",
        cwd: "/home/user/projects/my-app",
        sessionId: "e3e4a2ef-c6b5-4c39-a1f9-713a943be524",
        version: "2.1.5",
        gitBranch: "develop",
        slug: "declarative-snuggling-quokka",
        type: "system",
        subtype: "turn_duration",
        durationMs: 325282,
        timestamp: "2026-01-12T08:21:45.506Z",
        uuid: "787e1f01-c75d-42e8-858d-2c3117b79fb7",
        isMeta: false,
      });
      expect(result.success).toBe(true);
    });

    test("accepts turn_duration entry without optional fields", () => {
      const result = SystemEntrySchema.safeParse({
        parentUuid: null,
        isSidechain: false,
        userType: "external",
        cwd: "/some/path",
        sessionId: "abc123",
        version: "2.1.5",
        type: "system",
        subtype: "turn_duration",
        durationMs: 42967,
        timestamp: "2026-01-09T11:57:15.634Z",
        uuid: "c6a15d05-e435-4588-aff3-37e173f0b8a9",
      });
      expect(result.success).toBe(true);
    });

    test("rejects turn_duration entry without durationMs", () => {
      const result = SystemEntrySchema.safeParse({
        parentUuid: null,
        isSidechain: false,
        userType: "external",
        cwd: "/some/path",
        sessionId: "abc123",
        version: "2.1.5",
        type: "system",
        subtype: "turn_duration",
        timestamp: "2026-01-09T11:57:15.634Z",
        uuid: "c6a15d05-e435-4588-aff3-37e173f0b8a9",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("bridge_status subtype", () => {
    test("accepts valid bridge_status entry", () => {
      const result = SystemEntrySchema.safeParse({
        parentUuid: null,
        isSidechain: false,
        type: "system",
        subtype: "bridge_status",
        content:
          "/remote-control is active · Continue here, on your phone, or at https://claude.ai/code/session_0X0X0X0X0X0X0X0X0X0X0X0X",
        url: "https://claude.ai/code/session_0X0X0X0X0X0X0X0X0X0X0X0X",
        isMeta: false,
        timestamp: "2026-05-29T11:31:46.015Z",
        uuid: "bdc15df7-bf5a-4732-a51b-348e67975a2d",
        userType: "external",
        entrypoint: "cli",
        cwd: "/Users/rymalia/projects/standup",
        sessionId: "fc90d874-4741-4500-9462-a6255cfff0fe",
        version: "2.1.156",
        gitBranch: "main",
      });
      expect(result.success).toBe(true);
      const data = result.success ? result.data : undefined;
      if (data?.type !== "system" || data.subtype !== "bridge_status") {
        throw new Error("Expected bridge_status system entry");
      }
      expect(data.url).toBe("https://claude.ai/code/session_0X0X0X0X0X0X0X0X0X0X0X0X");
    });

    test("accepts bridge_status entry without url", () => {
      const result = SystemEntrySchema.safeParse({
        parentUuid: null,
        isSidechain: false,
        type: "system",
        subtype: "bridge_status",
        content: "/remote-control is active",
        timestamp: "2026-05-29T11:31:46.015Z",
        uuid: "bdc15df7-bf5a-4732-a51b-348e67975a2d",
        userType: "external",
        cwd: "/Users/rymalia/projects/standup",
        sessionId: "fc90d874-4741-4500-9462-a6255cfff0fe",
        version: "2.1.156",
      });
      expect(result.success).toBe(true);
    });

    test("rejects bridge_status entry without content", () => {
      const result = SystemEntrySchema.safeParse({
        parentUuid: null,
        isSidechain: false,
        type: "system",
        subtype: "bridge_status",
        timestamp: "2026-05-29T11:31:46.015Z",
        uuid: "bdc15df7-bf5a-4732-a51b-348e67975a2d",
        userType: "external",
        cwd: "/Users/rymalia/projects/standup",
        sessionId: "fc90d874-4741-4500-9462-a6255cfff0fe",
        version: "2.1.156",
      });
      expect(result.success).toBe(false);
    });
  });
});

describe("SystemEntrySchema: unmodelled subtypes", () => {
  test("accepts scheduled_task_fire (CLI 2.1.267, no dedicated schema)", () => {
    const result = SystemEntrySchema.safeParse({
      parentUuid: null,
      isSidechain: false,
      type: "system",
      timestamp: "2026-09-14T10:45:16.005Z",
      uuid: "9d5c86fd-66dc-45c1-b178-689b6acda6b4",
      userType: "external",
      entrypoint: "cli",
      cwd: "/home/user/project",
      sessionId: "11111111-1111-4111-8111-111111111111",
      version: "2.1.267",
      gitBranch: "main",
      isMeta: false,
      subtype: "scheduled_task_fire",
      content: "Claude resuming /loop wakeup (Jun 24 8:39pm)",
    });
    expect(result.success).toBe(true);
    if (!result.success || result.data.subtype !== "unknown-subtype") {
      throw new Error("Expected unknown-subtype entry");
    }
    expect(result.data.originalSubtype).toBe("scheduled_task_fire");
    expect(result.data.content).toBe("Claude resuming /loop wakeup (Jun 24 8:39pm)");
  });

  test("accepts model_refusal_fallback with level and extra fields", () => {
    const result = SystemEntrySchema.safeParse({
      parentUuid: null,
      isSidechain: false,
      type: "system",
      timestamp: "2026-09-14T10:45:16.005Z",
      uuid: "9d5c86fd-66dc-45c1-b178-689b6acda6b4",
      userType: "external",
      entrypoint: "cli",
      cwd: "/home/user/project",
      sessionId: "11111111-1111-4111-8111-111111111111",
      version: "2.1.267",
      gitBranch: "main",
      isMeta: false,
      subtype: "model_refusal_fallback",
      level: "warning",
      content: "Safeguards flagged this message; retrying with a fallback model.",
      trigger: "refusal",
      direction: "retry",
      originalModel: "model-a",
      fallbackModel: "model-b",
      retractedMessageUuids: ["da5a8fdb-fef4-4f11-862e-86e2a286bb6b"],
    });
    expect(result.success).toBe(true);
  });

  test("accepts informational with level notice", () => {
    const result = SystemEntrySchema.safeParse({
      parentUuid: null,
      isSidechain: false,
      type: "system",
      timestamp: "2026-09-14T10:45:16.005Z",
      uuid: "9d5c86fd-66dc-45c1-b178-689b6acda6b4",
      userType: "external",
      entrypoint: "cli",
      cwd: "/home/user/project",
      sessionId: "11111111-1111-4111-8111-111111111111",
      version: "2.1.267",
      gitBranch: "main",
      isMeta: false,
      subtype: "informational",
      level: "notice",
      content: "Saved settings.",
    });
    expect(result.success).toBe(true);
  });

  test("unknown subtype still requires the base fields", () => {
    const result = SystemEntrySchema.safeParse({
      type: "system",
      subtype: "scheduled_task_fire",
      content: "no base fields",
    });
    expect(result.success).toBe(false);
  });

  test("malformed entry of a modelled subtype is not rescued by the fallback", () => {
    const result = SystemEntrySchema.safeParse({
      parentUuid: null,
      isSidechain: false,
      type: "system",
      timestamp: "2026-09-14T10:45:16.005Z",
      uuid: "9d5c86fd-66dc-45c1-b178-689b6acda6b4",
      userType: "external",
      entrypoint: "cli",
      cwd: "/home/user/project",
      sessionId: "11111111-1111-4111-8111-111111111111",
      version: "2.1.267",
      gitBranch: "main",
      isMeta: false,
      subtype: "turn_duration", // requires durationMs
    });
    expect(result.success).toBe(false);
  });

  test("KNOWN_SYSTEM_SUBTYPES matches the modelled union", () => {
    // union = modelled subtypes + unknown-subtype fallback + undefined-subtype catch-all
    expect(SystemEntrySchema.options.length - 2).toBe(KNOWN_SYSTEM_SUBTYPES.size);
  });
});
