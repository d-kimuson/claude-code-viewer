import { useStore } from "jotai";
import { useEffect, useRef } from "react";
import {
  rightPanelActiveTabAtom,
  rightPanelOpenAtom,
} from "@/lib/atoms/rightPanel";
import { Route } from "@/routes/projects/$projectId/session";

/**
 * Bidirectionally syncs jotai right panel atoms with TanStack Router search params.
 *
 * - On mount: initializes atoms from URL search params
 * - On atom change: updates URL (replace, no navigation)
 * - On search param change (e.g. browser back/forward): updates atoms
 */
export const useSyncRightPanelWithSearchParams = () => {
  const store = useStore();
  const navigate = Route.useNavigate();
  const search = Route.useSearch();
  const isSyncingFromUrl = useRef(false);
  const isSyncingFromAtom = useRef(false);

  // On mount: initialize atoms from URL
  useEffect(() => {
    isSyncingFromUrl.current = true;
    store.set(rightPanelOpenAtom, search.rightPanel);
    store.set(rightPanelActiveTabAtom, search.rightPanelTab);
    isSyncingFromUrl.current = false;
  }, [search.rightPanel, search.rightPanelTab, store.set]); // eslint-disable-line react-hooks/exhaustive-deps

  // Subscribe to atom changes → update URL
  useEffect(() => {
    const unsubOpen = store.sub(rightPanelOpenAtom, () => {
      if (isSyncingFromUrl.current) return;
      isSyncingFromAtom.current = true;
      const isOpen = store.get(rightPanelOpenAtom);
      navigate({
        search: (prev) => ({ ...prev, rightPanel: isOpen }),
        replace: true,
      });
      // Reset flag after microtask to avoid feedback loop
      queueMicrotask(() => {
        isSyncingFromAtom.current = false;
      });
    });

    const unsubTab = store.sub(rightPanelActiveTabAtom, () => {
      if (isSyncingFromUrl.current) return;
      isSyncingFromAtom.current = true;
      const tab = store.get(rightPanelActiveTabAtom);
      navigate({
        search: (prev) => ({ ...prev, rightPanelTab: tab }),
        replace: true,
      });
      queueMicrotask(() => {
        isSyncingFromAtom.current = false;
      });
    });

    return () => {
      unsubOpen();
      unsubTab();
    };
  }, [store, navigate]);

  // Watch search params changes (browser back/forward) → update atoms
  useEffect(() => {
    if (isSyncingFromAtom.current) return;
    isSyncingFromUrl.current = true;
    store.set(rightPanelOpenAtom, search.rightPanel);
    store.set(rightPanelActiveTabAtom, search.rightPanelTab);
    isSyncingFromUrl.current = false;
  }, [search.rightPanel, search.rightPanelTab, store]);
};
