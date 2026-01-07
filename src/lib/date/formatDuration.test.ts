import { describe, expect, test } from "vitest";
import { calculateDuration, formatDuration } from "./formatDuration";

describe("formatDuration", () => {
  test("formats sub-second durations", () => {
    expect(formatDuration(500)).toBe("0.5s");
    expect(formatDuration(1)).toBe("0.0s");
    expect(formatDuration(999)).toBe("1.0s");
  });

  test("formats seconds with one decimal", () => {
    expect(formatDuration(1000)).toBe("1.0s");
    expect(formatDuration(1500)).toBe("1.5s");
    expect(formatDuration(30000)).toBe("30.0s");
    expect(formatDuration(59999)).toBe("60.0s");
  });

  test("formats minutes and seconds", () => {
    expect(formatDuration(60000)).toBe("1m");
    expect(formatDuration(61000)).toBe("1m 1s");
    expect(formatDuration(90000)).toBe("1m 30s");
    expect(formatDuration(120000)).toBe("2m");
    expect(formatDuration(125000)).toBe("2m 5s");
    expect(formatDuration(3599000)).toBe("59m 59s");
  });

  test("formats hours and minutes", () => {
    expect(formatDuration(3600000)).toBe("1h");
    expect(formatDuration(3660000)).toBe("1h 1m");
    expect(formatDuration(7200000)).toBe("2h");
    expect(formatDuration(7260000)).toBe("2h 1m");
  });

  test("handles negative durations", () => {
    expect(formatDuration(-1000)).toBe("0s");
  });

  test("handles zero duration", () => {
    expect(formatDuration(0)).toBe("0.0s");
  });
});

describe("calculateDuration", () => {
  test("calculates duration between two timestamps", () => {
    const start = "2024-01-01T10:00:00.000Z";
    const end = "2024-01-01T10:01:30.000Z";
    expect(calculateDuration(start, end)).toBe(90000);
  });

  test("returns null for invalid start timestamp", () => {
    expect(calculateDuration("invalid", "2024-01-01T10:00:00.000Z")).toBeNull();
  });

  test("returns null for invalid end timestamp", () => {
    expect(calculateDuration("2024-01-01T10:00:00.000Z", "invalid")).toBeNull();
  });

  test("handles negative duration when end is before start", () => {
    const start = "2024-01-01T10:01:00.000Z";
    const end = "2024-01-01T10:00:00.000Z";
    expect(calculateDuration(start, end)).toBe(-60000);
  });
});
