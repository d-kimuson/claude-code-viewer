import { atom } from "jotai";

export type AuthState = {
  authEnabled: boolean;
  authenticated: boolean;
  checked: boolean;
};

export const authAtom = atom<AuthState>({
  authEnabled: false,
  authenticated: false,
  checked: false,
});
