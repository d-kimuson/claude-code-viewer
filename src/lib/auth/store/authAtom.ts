import { atom } from "jotai";

export interface AuthState {
  authEnabled: boolean;
  authenticated: boolean;
}

export const authAtom = atom<AuthState>({
  authEnabled: false,
  authenticated: false,
});
