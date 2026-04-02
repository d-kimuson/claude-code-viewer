import { describe, expect, test } from "vitest";
import { parseUuid } from "./uuid.ts";

describe("parseUuid", () => {
  test("returns uuid when input is valid UUIDv4", () => {
    const raw = "550e8400-e29b-41d4-a716-446655440000";
    expect(parseUuid(raw)).toBe(raw);
  });

  test("accepts uppercase UUIDv4", () => {
    const raw = "550E8400-E29B-41D4-A716-446655440000";
    expect(parseUuid(raw)).toBe(raw);
  });

  test("throws when UUID version is not v4", () => {
    expect(() => parseUuid("550e8400-e29b-11d4-a716-446655440000")).toThrow("Invalid UUIDv4");
  });

  test("throws when UUID variant is invalid", () => {
    expect(() => parseUuid("550e8400-e29b-41d4-c716-446655440000")).toThrow("Invalid UUIDv4");
  });

  test("throws when format is invalid", () => {
    expect(() => parseUuid("not-a-uuid")).toThrow("Invalid UUIDv4");
  });
});
