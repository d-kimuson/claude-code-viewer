import { describe, expect, it } from "vitest";
import { resolveRightPanelOpen } from "./resolveRightPanelOpen";

describe("resolveRightPanelOpen", () => {
  describe("when URL value is explicitly set", () => {
    it("returns true when urlValue is true (PC)", () => {
      expect(resolveRightPanelOpen(true, false)).toBe(true);
    });

    it("returns true when urlValue is true (Mobile)", () => {
      expect(resolveRightPanelOpen(true, true)).toBe(true);
    });

    it("returns false when urlValue is false (PC)", () => {
      expect(resolveRightPanelOpen(false, false)).toBe(false);
    });

    it("returns false when urlValue is false (Mobile)", () => {
      expect(resolveRightPanelOpen(false, true)).toBe(false);
    });
  });

  describe("when URL value is undefined (device-specific defaults)", () => {
    it("returns true (open) on PC (width > 767px)", () => {
      const isMobile = false;
      expect(resolveRightPanelOpen(undefined, isMobile)).toBe(true);
    });

    it("returns false (closed) on Mobile (width <= 767px)", () => {
      const isMobile = true;
      expect(resolveRightPanelOpen(undefined, isMobile)).toBe(false);
    });
  });
});
