import { atom } from "jotai";
import type { RefObject } from "react";
import type { RightPanelTab } from "@/lib/types/rightPanel";

export const rightPanelOpenAtom = atom(false);
export const rightPanelActiveTabAtom = atom<RightPanelTab>("git");
export const rightPanelWidthAtom = atom(28);
export const rightPanelTodoOpenAtom = atom(true);

export const rightPanelBrowserUrlAtom = atom<string | null>(null);
export const rightPanelCurrentUrlAtom = atom<string | null>(null);
export const rightPanelInputUrlAtom = atom("");

export const rightPanelIframeRefAtom = atom<
  RefObject<HTMLIFrameElement | null>
>({
  current: null,
});
