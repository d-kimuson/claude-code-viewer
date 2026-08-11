import { describe, expect, test } from "vitest";
import { SystemEntrySchema } from "./SystemEntrySchema.ts";

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
