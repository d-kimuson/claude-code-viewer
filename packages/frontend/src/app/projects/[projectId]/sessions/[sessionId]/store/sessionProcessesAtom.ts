import type { PublicSessionProcess } from "@claude-code-viewer/shared/types/session-process";
import { atom } from "jotai";

export const sessionProcessesAtom = atom<PublicSessionProcess[]>([]);
