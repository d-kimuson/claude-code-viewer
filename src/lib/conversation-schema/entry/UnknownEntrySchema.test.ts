import { describe, expect, test } from "vitest";
import { createUnknownEntrySchema } from "./UnknownEntrySchema.ts";

const schema = createUnknownEntrySchema(new Set(["user", "assistant", "bridge-session"]));

// Real entries emitted by Claude Code CLI 2.1.x that had no schema in 0.8.2.
const samples = [
  { type: "atis-latch", atis: "", sessionId: "11111111-1111-4111-8111-111111111111" },
  {
    type: "history-suppression",
    sessionId: "22222222-2222-4222-8222-222222222222",
    cause: "restored_owner_mismatch",
    vetoedAgainstAccountUuid: "33333333-3333-4333-8333-333333333333",
    ts: "2026-08-16T17:18:17.530Z",
  },
  {
    type: "frame-link",
    sessionId: "22222222-2222-4222-8222-222222222222",
    path: "/home/user/project",
    frameUrl: "https://claude.ai/code/artifact/44444444-4444-4444-8444-444444444444",
    title: "Example",
    artifactCount: 1,
    timestamp: "2026-09-02T14:28:19.250Z",
  },
  {
    type: "file-history-delta",
    messageId: "55555555-5555-4555-8555-555555555555",
    snapshotMessageId: "66666666-6666-4666-8666-666666666666",
    trackingPath: "inventory/prod.yml",
    backup: {
      backupFileName: "0123456789abcdef@v1",
      version: 1,
      backupTime: "2026-08-26T16:16:47.483Z",
    },
    timestamp: "2026-08-26T16:16:47.484Z",
  },
  {
    type: "artifact-autoreact-ledger",
    v: 1,
    sessionId: "22222222-2222-4222-8222-222222222222",
    artifacts: {},
  },
  {
    type: "artifact-comment-monitor",
    v: 1,
    sessionId: "22222222-2222-4222-8222-222222222222",
    artifacts: {},
  },
  {
    type: "cost-state",
    sessionId: "77777777-7777-4777-8777-777777777777",
    totalCostUSD: 18.53,
    modelUsage: {},
  },
];

describe("UnknownEntrySchema", () => {
  test.each(samples)("normalises unknown inert entry `$type`", (sample) => {
    const result = schema.safeParse(sample);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.type).toBe("unknown-entry");
    expect(result.data.originalType).toBe(sample.type);
    expect(result.data.sessionId).toBe(sample.sessionId);
    expect(result.data.raw).not.toHaveProperty("type");
  });

  test("sessionId is undefined when the entry has none", () => {
    const result = schema.safeParse({ type: "file-history-delta", messageId: "m1" });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.sessionId).toBeUndefined();
    expect(result.data.raw).toEqual({ messageId: "m1" });
  });

  test("rejects entries of a known type (malformed known entries must still fail)", () => {
    expect(schema.safeParse({ type: "bridge-session", sessionId: "s" }).success).toBe(false);
    expect(schema.safeParse({ type: "user" }).success).toBe(false);
  });

  test("rejects entries without a string type", () => {
    expect(schema.safeParse({ sessionId: "s" }).success).toBe(false);
    expect(schema.safeParse({ type: 42 }).success).toBe(false);
  });
});
