/**
 * Resolves the effective right panel open state.
 * - If `urlValue` is explicitly set (boolean), use it.
 * - If `urlValue` is undefined, apply device-specific default:
 *   - PC (width > 767px): true (open)
 *   - Mobile (width <= 767px): false (closed)
 */
export const resolveRightPanelOpen = (
  urlValue: boolean | undefined,
  isMobile: boolean,
): boolean => {
  if (urlValue !== undefined) {
    return urlValue;
  }
  // Device-specific default: PC = open, Mobile = closed
  return !isMobile;
};
