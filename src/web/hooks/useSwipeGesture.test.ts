import { describe, expect, it } from "vitest";
import { detectSwipe, type SwipeDetectParams } from "./useSwipeGesture";

describe("detectSwipe", () => {
  const defaults = {
    threshold: 50,
    maxVerticalRatio: 0.75,
    edgeWidth: undefined,
  } satisfies Pick<SwipeDetectParams, "threshold" | "maxVerticalRatio" | "edgeWidth">;

  it("returns 'right' for a valid right swipe", () => {
    const result = detectSwipe({
      ...defaults,
      startX: 10,
      startY: 100,
      endX: 120,
      endY: 100,
    });
    expect(result).toBe("right");
  });

  it("returns 'left' for a valid left swipe", () => {
    const result = detectSwipe({
      ...defaults,
      startX: 200,
      startY: 100,
      endX: 50,
      endY: 100,
    });
    expect(result).toBe("left");
  });

  it("returns null for right swipe from non-edge area when edgeWidth is set", () => {
    const result = detectSwipe({
      ...defaults,
      edgeWidth: 30,
      startX: 100,
      startY: 100,
      endX: 250,
      endY: 100,
    });
    expect(result).toBeNull();
  });

  it("returns 'right' for right swipe from edge area when edgeWidth is set", () => {
    const result = detectSwipe({
      ...defaults,
      edgeWidth: 30,
      startX: 20,
      startY: 100,
      endX: 150,
      endY: 100,
    });
    expect(result).toBe("right");
  });

  it("returns null for vertical swipe (too much Y movement)", () => {
    const result = detectSwipe({
      ...defaults,
      startX: 10,
      startY: 100,
      endX: 70,
      endY: 300,
    });
    expect(result).toBeNull();
  });

  it("returns null for swipe below threshold", () => {
    const result = detectSwipe({
      ...defaults,
      startX: 10,
      startY: 100,
      endX: 40,
      endY: 100,
    });
    expect(result).toBeNull();
  });

  it("allows left swipe regardless of edgeWidth", () => {
    const result = detectSwipe({
      ...defaults,
      edgeWidth: 30,
      startX: 200,
      startY: 100,
      endX: 50,
      endY: 100,
    });
    expect(result).toBe("left");
  });

  it("returns null when deltaX is zero", () => {
    const result = detectSwipe({
      ...defaults,
      startX: 100,
      startY: 100,
      endX: 100,
      endY: 200,
    });
    expect(result).toBeNull();
  });
});
