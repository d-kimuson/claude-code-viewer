import { describe, expect, test } from "vitest";
import { AttachmentEntrySchema } from "./AttachmentEntrySchema.ts";

const baseFields = {
  parentUuid: "ac626c7a-6bc2-4a52-aaa4-f7eb6ed5409d",
  isSidechain: false,
  type: "attachment",
  uuid: "29b1cfc7-2e7e-454d-b498-f4d798858b1f",
  timestamp: "2026-04-05T09:08:13.089Z",
  userType: "external",
  cwd: "/path/to/project",
  sessionId: "2825293e-3ecd-470e-82de-681376a273a0",
  version: "2.1.92",
};

describe("AttachmentEntrySchema", () => {
  describe("deferred_tools_delta", () => {
    test("accepts valid entry", () => {
      const result = AttachmentEntrySchema.safeParse({
        ...baseFields,
        entrypoint: "cli",
        gitBranch: "main",
        slug: "cozy-booping-sky",
        attachment: {
          type: "deferred_tools_delta",
          addedNames: ["AskUserQuestion", "WebFetch"],
          addedLines: ["AskUserQuestion", "WebFetch"],
          removedNames: [],
        },
      });
      expect(result.success).toBe(true);
    });

    test("accepts entry without optional fields", () => {
      const result = AttachmentEntrySchema.safeParse({
        ...baseFields,
        attachment: {
          type: "deferred_tools_delta",
          addedNames: [],
          addedLines: [],
          removedNames: [],
        },
      });
      expect(result.success).toBe(true);
    });

    test("falls back to unknown schema when addedLines is missing", () => {
      const result = AttachmentEntrySchema.safeParse({
        ...baseFields,
        attachment: {
          type: "deferred_tools_delta",
          addedNames: [],
          removedNames: [],
        },
      });
      // Accepted by UnknownAttachmentSchema fallback
      expect(result.success).toBe(true);
    });
  });

  describe("mcp_instructions_delta", () => {
    test("accepts valid entry", () => {
      const result = AttachmentEntrySchema.safeParse({
        ...baseFields,
        entrypoint: "cli",
        gitBranch: "main",
        slug: "cozy-booping-sky",
        attachment: {
          type: "mcp_instructions_delta",
          addedNames: ["context7", "linear-server"],
          addedBlocks: ["## context7\nSome instructions"],
          removedNames: [],
        },
      });
      expect(result.success).toBe(true);
    });

    test("accepts entry without optional fields", () => {
      const result = AttachmentEntrySchema.safeParse({
        ...baseFields,
        attachment: {
          type: "mcp_instructions_delta",
          addedNames: [],
          addedBlocks: [],
          removedNames: [],
        },
      });
      expect(result.success).toBe(true);
    });

    test("rejects entry missing attachment type", () => {
      const result = AttachmentEntrySchema.safeParse({
        ...baseFields,
        attachment: {
          addedNames: [],
          removedNames: [],
        },
      });
      expect(result.success).toBe(false);
    });
  });

  describe("companion_intro", () => {
    test("accepts valid entry", () => {
      const result = AttachmentEntrySchema.safeParse({
        ...baseFields,
        attachment: {
          type: "companion_intro",
          name: "Crumb",
          species: "owl",
        },
      });
      expect(result.success).toBe(true);
      expect(result.data?.attachment.type).toBe("companion_intro");
    });

    test("falls back to unknown schema when name is missing", () => {
      const result = AttachmentEntrySchema.safeParse({
        ...baseFields,
        attachment: {
          type: "companion_intro",
          species: "owl",
        },
      });
      // Accepted by UnknownAttachmentSchema fallback
      expect(result.success).toBe(true);
    });
  });

  describe("unknown attachment type (fallback)", () => {
    test("accepts unknown attachment types gracefully", () => {
      const result = AttachmentEntrySchema.safeParse({
        ...baseFields,
        attachment: {
          type: "some_future_type",
          someField: "value",
        },
      });
      expect(result.success).toBe(true);
      expect(result.data?.attachment.type).toBe("some_future_type");
    });
  });
});
