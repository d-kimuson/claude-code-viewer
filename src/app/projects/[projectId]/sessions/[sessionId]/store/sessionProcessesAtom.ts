import { atom } from "jotai";
import type { PublicSessionProcess } from "../../../../../../types/session-process";

export const sessionProcessesAtom = atom<PublicSessionProcess[]>([]);
