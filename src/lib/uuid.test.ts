import { describe, expect, test } from "vitest";
import { generateUuid, parseUuid } from "./uuid.ts";

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

describe("generateUuid", () => {
  const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

  test("uses crypto.randomUUID when available", () => {
    const raw = "550e8400-e29b-41d4-a716-446655440000";
    const source = {
      randomUUID: () => raw,
      getRandomValues: <T extends Uint8Array>(array: T) => array,
    };
    expect(generateUuid(source)).toBe(raw);
  });

  test("falls back to getRandomValues when randomUUID is unavailable (insecure context)", () => {
    const source = {
      getRandomValues: <T extends Uint8Array>(array: T) => {
        array.fill(0xff);
        return array;
      },
    };
    expect(generateUuid(source)).toBe("ffffffff-ffff-4fff-bfff-ffffffffffff");
  });

  test("fallback produces valid UUIDv4 for all-zero random bytes", () => {
    const source = {
      getRandomValues: <T extends Uint8Array>(array: T) => array,
    };
    expect(generateUuid(source)).toBe("00000000-0000-4000-8000-000000000000");
  });

  test("generates distinct valid UUIDv4 values with the default crypto", () => {
    const first = generateUuid();
    const second = generateUuid();
    expect(first).toMatch(UUID_V4_PATTERN);
    expect(second).toMatch(UUID_V4_PATTERN);
    expect(first).not.toBe(second);
  });
});
