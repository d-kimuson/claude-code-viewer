import { atom } from "jotai";

export const sseAtom = atom<{
  isConnected: boolean;
}>({
  isConnected: false,
});
