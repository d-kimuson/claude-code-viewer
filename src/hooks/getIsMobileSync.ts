const MOBILE_BREAKPOINT = 767;

/**
 * Synchronously determines if the current viewport is mobile-sized.
 * Returns `true` if the viewport width is <= 767px.
 *
 * This function is intended for initial render to avoid flicker.
 * For reactive updates, use `useIsMobile` hook instead.
 *
 * @returns `true` if mobile, `false` if desktop or SSR
 */
export const getIsMobileSync = (): boolean => {
  if (typeof window === "undefined") return false;
  return window.innerWidth <= MOBILE_BREAKPOINT;
};
