import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getIsMobileSync } from "./getIsMobileSync";

describe("getIsMobileSync", () => {
  const originalWindow = globalThis.window;

  beforeEach(() => {
    // Reset window mock before each test
    vi.stubGlobal("window", undefined);
  });

  afterEach(() => {
    // Restore original window
    if (originalWindow !== undefined) {
      vi.stubGlobal("window", originalWindow);
    }
    vi.unstubAllGlobals();
  });

  describe("SSR environment (no window)", () => {
    it("returns false when window is undefined", () => {
      vi.stubGlobal("window", undefined);
      expect(getIsMobileSync()).toBe(false);
    });
  });

  describe("Browser environment", () => {
    it("returns true when viewport width is <= 767px (mobile)", () => {
      vi.stubGlobal("window", { innerWidth: 767 });
      expect(getIsMobileSync()).toBe(true);
    });

    it("returns true when viewport width is less than 767px", () => {
      vi.stubGlobal("window", { innerWidth: 375 });
      expect(getIsMobileSync()).toBe(true);
    });

    it("returns false when viewport width is > 767px (PC)", () => {
      vi.stubGlobal("window", { innerWidth: 768 });
      expect(getIsMobileSync()).toBe(false);
    });

    it("returns false when viewport width is much larger than breakpoint", () => {
      vi.stubGlobal("window", { innerWidth: 1920 });
      expect(getIsMobileSync()).toBe(false);
    });
  });
});
