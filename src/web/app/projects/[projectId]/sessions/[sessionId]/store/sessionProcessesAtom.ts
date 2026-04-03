import { atom } from "jotai";
import type { PublicSessionProcess } from "@/types/session-process";

export const sessionProcessesAtom = atom<PublicSessionProcess[]>([]);

/**
 * Tracks session IDs that were aborted by the user.
 * Used to suppress "Task completed" toast/sound on user-initiated abort.
 */
export const abortedByUserSessionIdsAtom = atom<Set<string>>(new Set<string>());
