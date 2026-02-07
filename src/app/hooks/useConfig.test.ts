import { describe, expect, it } from "vitest";
import type { AuthState } from "../../lib/auth/store/authAtom";
import { canFetchConfig } from "./useConfig";

const createAuthState = (overrides: Partial<AuthState>): AuthState => ({
  authEnabled: false,
  authenticated: false,
  checked: false,
  ...overrides,
});

describe("canFetchConfig", () => {
  it("returns false when auth is not checked", () => {
    const state = createAuthState({ authEnabled: false, checked: false });

    expect(canFetchConfig(state)).toBe(false);
  });

  it("returns true when auth is disabled and checked", () => {
    const state = createAuthState({ authEnabled: false, checked: true });

    expect(canFetchConfig(state)).toBe(true);
  });

  it("returns false when auth is enabled but not authenticated", () => {
    const state = createAuthState({
      authEnabled: true,
      authenticated: false,
      checked: true,
    });

    expect(canFetchConfig(state)).toBe(false);
  });

  it("returns true when auth is enabled and authenticated", () => {
    const state = createAuthState({
      authEnabled: true,
      authenticated: true,
      checked: true,
    });

    expect(canFetchConfig(state)).toBe(true);
  });
});
