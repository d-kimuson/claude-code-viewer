// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const storageValues = new Map<string, string>();
const testLocalStorage: Storage = {
  get length() {
    return storageValues.size;
  },
  clear: () => storageValues.clear(),
  getItem: (key) => storageValues.get(key) ?? null,
  key: (index) => Array.from(storageValues.keys())[index] ?? null,
  removeItem: (key) => storageValues.delete(key),
  setItem: (key, value) => storageValues.set(key, value),
};

describe("sessionOptionsAtom", () => {
  beforeEach(() => {
    storageValues.clear();
    vi.stubGlobal("localStorage", testLocalStorage);
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("hydrates synchronously from localStorage instead of waiting for a mount/subscribe cycle", async () => {
    localStorage.setItem(
      "claude-code-viewer-session-options",
      JSON.stringify({ "project-a": { permissionMode: "bypassPermissions" } }),
    );

    const [{ sessionOptionsAtom }, { createStore }] = await Promise.all([
      import("./sessionOptions"),
      import("jotai/vanilla"),
    ]);
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
