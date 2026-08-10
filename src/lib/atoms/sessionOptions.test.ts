// @vitest-environment jsdom
import { createStore } from "jotai/vanilla";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("sessionOptionsAtom", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it("hydrates synchronously from localStorage instead of waiting for a mount/subscribe cycle", async () => {
    localStorage.setItem(
      "claude-code-viewer-session-options",
      JSON.stringify({ "project-a": { permissionMode: "bypassPermissions" } }),
    );

    const { sessionOptionsAtom } = await import("./sessionOptions.ts");
    const store = createStore();

    // Reading the atom immediately after creation (no subscribe/mount) must already
    // reflect localStorage. Without getOnInit, this would still be the {} initialValue,
    // because jotai only loads storage inside onMount (a useEffect that fires after the
    // first render), which is too late for a useState lazy initializer that reads it.
    expect(store.get(sessionOptionsAtom)).toEqual({
      "project-a": { permissionMode: "bypassPermissions" },
    });
  });
});
