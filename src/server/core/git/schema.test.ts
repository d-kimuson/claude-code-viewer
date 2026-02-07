import { describe, expect, test } from "vitest";
import { CommitAndPushRequestSchema, CommitRequestSchema } from "./schema";

describe("CommitRequestSchema", () => {
  test("accepts valid request", () => {
    const result = CommitRequestSchema.safeParse({
      projectId: "abc",
      files: ["src/foo.ts"],
      message: "test commit",
    });
    expect(result.success).toBe(true);
  });

  test("rejects empty files array", () => {
    const result = CommitRequestSchema.safeParse({
      projectId: "abc",
      files: [],
      message: "test",
    });
    expect(result.success).toBe(false);
  });

  test("rejects empty message", () => {
    const result = CommitRequestSchema.safeParse({
      projectId: "abc",
      files: ["a.ts"],
      message: "   ",
    });
    expect(result.success).toBe(false);
  });

  test("rejects empty projectId", () => {
    const result = CommitRequestSchema.safeParse({
      projectId: "",
      files: ["a.ts"],
      message: "test",
    });
    expect(result.success).toBe(false);
  });

  test("rejects empty file path in files array", () => {
    const result = CommitRequestSchema.safeParse({
      projectId: "abc",
      files: [""],
      message: "test",
    });
    expect(result.success).toBe(false);
  });
});

describe("CommitAndPushRequestSchema", () => {
  test("accepts valid request", () => {
    const result = CommitAndPushRequestSchema.safeParse({
      projectId: "abc",
      files: ["src/foo.ts"],
      message: "test commit",
    });
    expect(result.success).toBe(true);
  });

  test("has same validation rules as CommitRequestSchema", () => {
    const result = CommitAndPushRequestSchema.safeParse({
      projectId: "abc",
      files: [],
      message: "test",
    });
    expect(result.success).toBe(false);
  });
});
