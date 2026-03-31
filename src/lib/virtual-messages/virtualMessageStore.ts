export type VirtualMessage = {
  readonly sessionId: string;
  readonly projectId: string;
  readonly userMessage: string;
  readonly sentAt: string; // ISO timestamp
};

const store = new Map<string, VirtualMessage>();

export const addVirtualMessage = (message: VirtualMessage): void => {
  store.set(message.sessionId, message);
};

export const getVirtualMessage = (
  sessionId: string,
): VirtualMessage | undefined => {
  return store.get(sessionId);
};

export const removeVirtualMessage = (sessionId: string): void => {
  store.delete(sessionId);
};

export const getVirtualMessagesByProject = (
  projectId: string,
): VirtualMessage[] => {
  return [...store.values()].filter((m) => m.projectId === projectId);
};

export const clear = (): void => {
  store.clear();
};
