import { useCallback, useEffect, useRef } from "react";

type SwipeDirection = "left" | "right";

interface UseSwipeGestureOptions {
  onSwipe: (direction: SwipeDirection) => void;
  /** Minimum horizontal pixels to trigger a swipe (default: 50) */
  threshold?: number;
  /** Maximum Y/X ratio to still count as horizontal swipe (default: 0.75) */
  maxVerticalRatio?: number;
  /** Edge zone width in px for right swipes. undefined = any position (default: undefined) */
  edgeWidth?: number;
  /** Whether gesture detection is enabled (default: true) */
  enabled?: boolean;
}

export interface SwipeDetectParams {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  threshold: number;
  maxVerticalRatio: number;
  edgeWidth: number | undefined;
}

/**
 * Pure function to detect swipe direction from touch coordinates.
 * Returns the swipe direction or null if no valid swipe detected.
 */
export const detectSwipe = ({
  startX,
  startY,
  endX,
  endY,
  threshold,
  maxVerticalRatio,
  edgeWidth,
}: SwipeDetectParams): SwipeDirection | null => {
  const deltaX = endX - startX;
  const deltaY = endY - startY;
  const absDeltaX = Math.abs(deltaX);
  const absDeltaY = Math.abs(deltaY);

  // Not enough horizontal movement
  if (absDeltaX < threshold) {
    return null;
  }

  // Too much vertical movement relative to horizontal
  if (absDeltaX > 0 && absDeltaY / absDeltaX > maxVerticalRatio) {
    return null;
  }

  const direction: SwipeDirection = deltaX > 0 ? "right" : "left";

  // For right swipes, check edge constraint
  if (direction === "right" && edgeWidth !== undefined && startX >= edgeWidth) {
    return null;
  }

  return direction;
};

/** Extract first touch coordinates from a TouchEvent */
const getFirstTouch = (
  e: TouchEvent,
): { clientX: number; clientY: number } | undefined => {
  const touch = e.changedTouches[0];
  if (!touch) return undefined;
  return { clientX: touch.clientX, clientY: touch.clientY };
};

/**
 * Hook for detecting horizontal swipe gestures on a container element.
 * Returns a callback ref to attach to the target element.
 *
 * Uses passive touch listeners (touchstart + touchend only, no touchmove).
 */
export const useSwipeGesture = ({
  onSwipe,
  threshold = 50,
  maxVerticalRatio = 0.75,
  edgeWidth,
  enabled = true,
}: UseSwipeGestureOptions): ((element: HTMLElement | null) => void) => {
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const onSwipeRef = useRef(onSwipe);
  onSwipeRef.current = onSwipe;

  const callbackRef = useCallback(
    (element: HTMLElement | null) => {
      // Clean up previous listeners
      cleanupRef.current?.();
      cleanupRef.current = null;

      if (!element || !enabled) {
        return;
      }

      const handleTouchStart = (e: TouchEvent) => {
        const touch = getFirstTouch(e);
        if (!touch) return;
        startRef.current = { x: touch.clientX, y: touch.clientY };
      };

      const handleTouchEnd = (e: TouchEvent) => {
        const start = startRef.current;
        if (!start) return;

        const touch = getFirstTouch(e);
        if (!touch) return;

        startRef.current = null;

        const direction = detectSwipe({
          startX: start.x,
          startY: start.y,
          endX: touch.clientX,
          endY: touch.clientY,
          threshold,
          maxVerticalRatio,
          edgeWidth,
        });

        if (direction) {
          onSwipeRef.current(direction);
        }
      };

      element.addEventListener("touchstart", handleTouchStart, {
        passive: true,
      });
      element.addEventListener("touchend", handleTouchEnd, { passive: true });

      cleanupRef.current = () => {
        element.removeEventListener("touchstart", handleTouchStart);
        element.removeEventListener("touchend", handleTouchEnd);
      };
    },
    [enabled, threshold, maxVerticalRatio, edgeWidth],
  );

  // Defensive cleanup on unmount (especially important for portal-based components)
  useEffect(() => {
    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, []);

  return callbackRef;
};
