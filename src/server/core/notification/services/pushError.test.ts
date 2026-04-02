import { describe, expect, it } from "vitest";
import { formatPushError, shouldDropSubscriptionForPushError } from "./pushError.ts";

describe("shouldDropSubscriptionForPushError", () => {
  it("returns true for 404 Gone endpoints", () => {
    expect(shouldDropSubscriptionForPushError({ statusCode: 404 })).toBe(true);
  });

  it("returns true for 410 Gone endpoints", () => {
    expect(shouldDropSubscriptionForPushError({ statusCode: 410 })).toBe(true);
  });

  it("returns false for transient server errors", () => {
    expect(shouldDropSubscriptionForPushError({ statusCode: 503 })).toBe(false);
  });

  it("returns false for unknown error shapes", () => {
    expect(shouldDropSubscriptionForPushError(new Error("network down"))).toBe(false);
    expect(shouldDropSubscriptionForPushError("unknown")).toBe(false);
  });
});

describe("formatPushError", () => {
  it("formats status code and body when available", () => {
    expect(formatPushError({ statusCode: 401, body: "Unauthorized" })).toContain("status=401");
    expect(formatPushError({ statusCode: 401, body: "Unauthorized" })).toContain(
      "body=Unauthorized",
    );
  });

  it("falls back to message when status/body are unavailable", () => {
    expect(formatPushError(new Error("boom"))).toBe("message=boom");
  });
});
