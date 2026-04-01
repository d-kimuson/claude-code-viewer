import { useAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { useCallback, useMemo } from "react";
import { z } from "zod";

const persistedSessionOptionsSchema = z.object({
  model: z.string().optional(),
  effort: z.enum(["low", "medium", "high", "max"]).optional(),
  permissionMode: z.enum(["acceptEdits", "bypassPermissions", "default", "plan"]).optional(),
  useSystemPromptPreset: z.boolean().optional(),
});

export type PersistedSessionOptions = z.infer<typeof persistedSessionOptionsSchema>;

type SessionOptionsStore = Record<string, PersistedSessionOptions>;

const sessionOptionsAtom = atomWithStorage<SessionOptionsStore>(
  "claude-code-viewer-session-options",
  {},
);

export const useProjectSessionOptions = (projectId: string) => {
  const [store, setStore] = useAtom(sessionOptionsAtom);

  const options = useMemo(
    () => store[projectId] ?? ({} satisfies PersistedSessionOptions),
    [store, projectId],
  );

  const setOptions = useCallback(
    (update: PersistedSessionOptions) => {
      setStore((prev) => ({
        ...prev,
        [projectId]: update,
      }));
    },
    [setStore, projectId],
  );

  return [options, setOptions] as const;
};
