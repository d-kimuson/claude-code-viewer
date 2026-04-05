import { atom, getDefaultStore } from "jotai";

export type VirtualMessage = {
  readonly sessionId: string;
  readonly projectId: string;
  readonly userMessage: string;
  readonly sentAt: string; // ISO timestamp
  readonly isNewSession: boolean;
  /** Number of conversations in the session when the virtual message was created.
   *  Used as a fallback signal to detect when the real message has arrived. */
  readonly conversationCount?: number;
};

export const virtualMessagesAtom = atom<ReadonlyMap<string, VirtualMessage>>(new Map());

const jotaiStore = getDefaultStore();

export const addVirtualMessage = (message: VirtualMessage): void => {
  const current = jotaiStore.get(virtualMessagesAtom);
  const next = new Map(current);
  next.set(message.sessionId, message);
  jotaiStore.set(virtualMessagesAtom, next);
};

export const getVirtualMessage = (sessionId: string): VirtualMessage | undefined => {
  return jotaiStore.get(virtualMessagesAtom).get(sessionId);
};

export const removeVirtualMessage = (sessionId: string): void => {
  const current = jotaiStore.get(virtualMessagesAtom);
  if (!current.has(sessionId)) return;
  const next = new Map(current);
  next.delete(sessionId);
  jotaiStore.set(virtualMessagesAtom, next);
};

export const getVirtualMessagesByProject = (projectId: string): VirtualMessage[] => {
  return [...jotaiStore.get(virtualMessagesAtom).values()].filter((m) => m.projectId === projectId);
};

export const clear = (): void => {
  jotaiStore.set(virtualMessagesAtom, new Map());
};
