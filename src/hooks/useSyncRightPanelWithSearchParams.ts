import { useStore } from "jotai";
import { useEffect, useRef } from "react";
import {
  rightPanelActiveTabAtom,
  rightPanelOpenAtom,
} from "@/lib/atoms/rightPanel";
import { Route } from "@/routes/projects/$projectId/session";
import { getIsMobileSync } from "./getIsMobileSync";
import { resolveRightPanelOpen } from "./resolveRightPanelOpen";
import { useIsMobile } from "./useIsMobile";

/**
 * Bidirectionally syncs jotai right panel atoms with TanStack Router search params.
 *
 * - On mount: initializes atoms from URL search params (with device-specific defaults for undefined)
 * - On atom change: updates URL (replace, no navigation)
 * - On search param change (e.g. browser back/forward): updates atoms
 *
 * Device-specific defaults (applied only when URL `rightPanel` is undefined):
 * - PC (width > 767px): default open (true)
 * - Mobile (width <= 767px): default closed (false)
 */
export const useSyncRightPanelWithSearchParams = () => {
  const store = useStore();
  const navigate = Route.useNavigate();
  const search = Route.useSearch();
  const isSyncingFromUrl = useRef(false);
  const isSyncingFromAtom = useRef(false);

  // Use synchronous initial value to avoid flicker, then reactively update
  const isMobile = useIsMobile();
  // Track if initial sync has been done to avoid applying defaults after explicit user action
  const hasInitializedRef = useRef(false);

  // On mount: initialize atoms from URL (with device-specific defaults)
  useEffect(() => {
    isSyncingFromUrl.current = true;

    // For initial mount, use sync check to avoid flicker
    // For subsequent updates (e.g., browser back/forward), use current isMobile value
    const effectiveIsMobile = hasInitializedRef.current
      ? isMobile
      : getIsMobileSync();

    const effectiveOpen = resolveRightPanelOpen(
      search.rightPanel,
      effectiveIsMobile,
    );
    store.set(rightPanelOpenAtom, effectiveOpen);
    store.set(rightPanelActiveTabAtom, search.rightPanelTab);

    hasInitializedRef.current = true;
    isSyncingFromUrl.current = false;
  }, [search.rightPanel, search.rightPanelTab, store, isMobile]);

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
};
