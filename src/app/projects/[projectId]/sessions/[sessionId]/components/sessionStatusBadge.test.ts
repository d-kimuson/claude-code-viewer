import { describe, expect, it } from "vitest";
import { getSessionStatusBadgeProps } from "./sessionStatusBadge";

describe("getSessionStatusBadgeProps", () => {
  it("returns running badge props", () => {
    const result = getSessionStatusBadgeProps("running");

    expect(result).toEqual({
      labelId: "session.status.running",
      className:
        "bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20",
      icon: "running",
    });
  });

  it("returns paused badge props", () => {
    const result = getSessionStatusBadgeProps("paused");

    expect(result).toEqual({
      labelId: "session.status.paused",
      className:
        "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20",
      icon: "paused",
    });
  });

  it("returns undefined for empty status", () => {
    const result = getSessionStatusBadgeProps(undefined);

    expect(result).toBeUndefined();
  });
});
