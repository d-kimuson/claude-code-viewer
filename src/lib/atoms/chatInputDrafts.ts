import { useAtom } from "jotai";
import { atomWithStorage, createJSONStorage } from "jotai/utils";
import { type SetStateAction, useCallback } from "react";
import { z } from "zod";

const chatInputDraftStoreSchema = z.record(z.string(), z.string());

export type ChatInputDraftStore = z.infer<typeof chatInputDraftStoreSchema>;

export type ChatInputDraftScope = {
  projectId: string;
  sessionId: string;
};

export const buildChatInputDraftKey = ({ projectId, sessionId }: ChatInputDraftScope) =>
  `${projectId}:${sessionId}`;

export const sanitizeChatInputDraftStore = (value: unknown, fallback: ChatInputDraftStore) => {
  const result = chatInputDraftStoreSchema.safeParse(value);
  return result.success ? result.data : fallback;
};

export const updateChatInputDraftStore = (
  store: ChatInputDraftStore,
  key: string,
  value: string,
): ChatInputDraftStore => {
  if (value === "") {
    const { [key]: _removed, ...rest } = store;
    return rest;
  }

  return {
    ...store,
    [key]: value,
  };
};

const baseStorage = createJSONStorage<ChatInputDraftStore>(() => localStorage);

const chatInputDraftStorage = {
  getItem: (key: string, initialValue: ChatInputDraftStore) =>
    sanitizeChatInputDraftStore(baseStorage.getItem(key, initialValue), initialValue),
  setItem: (key: string, newValue: ChatInputDraftStore) => baseStorage.setItem(key, newValue),
  removeItem: (key: string) => baseStorage.removeItem(key),
};

const chatInputDraftsAtom = atomWithStorage<ChatInputDraftStore>(
  "claude-code-viewer-chat-input-drafts",
  {},
  chatInputDraftStorage,
);

export const useChatInputDraft = (scope: ChatInputDraftScope) => {
  const [store, setStore] = useAtom(chatInputDraftsAtom);
  const draftKey = buildChatInputDraftKey(scope);
  const value = store[draftKey] ?? "";

  const setValue = useCallback(
    (nextValue: SetStateAction<string>) => {
      setStore((prev) => {
        const currentValue = prev[draftKey] ?? "";
        const resolvedValue = typeof nextValue === "function" ? nextValue(currentValue) : nextValue;

        return updateChatInputDraftStore(prev, draftKey, resolvedValue);
      });
    },
    [draftKey, setStore],
  );

  const clearValue = useCallback(() => {
    setStore((prev) => updateChatInputDraftStore(prev, draftKey, ""));
  }, [draftKey, setStore]);

  return [value, setValue, clearValue] as const;
};
