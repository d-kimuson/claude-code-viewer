import type { MouseEvent as ReactMouseEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

type DragResizeOptions = {
  onResize: (event: MouseEvent) => void;
  onResizeStart?: () => void;
  onResizeEnd?: () => void;
  enabled?: boolean;
};

export const useDragResize = ({
  onResize,
  onResizeStart,
  onResizeEnd,
  enabled = true,
}: DragResizeOptions) => {
  const [isResizing, setIsResizing] = useState(false);
  const isResizingRef = useRef(false);
  const frameRef = useRef<number | null>(null);
  const latestEventRef = useRef<MouseEvent | null>(null);

  const stopResizing = useCallback(() => {
    isResizingRef.current = false;
    setIsResizing(false);
    onResizeEnd?.();
  }, [onResizeEnd]);

  const handleMouseDown = useCallback(
    (event: ReactMouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      isResizingRef.current = true;
      setIsResizing(true);
      onResizeStart?.();
    },
    [onResizeStart],
  );

  useEffect(() => {
    if (!enabled) {
      stopResizing();
      return;
    }

    const scheduleResize = () => {
      if (frameRef.current !== null) return;
      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = null;
        const latestEvent = latestEventRef.current;
        if (!latestEvent) return;
        onResize(latestEvent);
      });
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!isResizingRef.current) return;
      event.preventDefault();
      latestEventRef.current = event;
      scheduleResize();
    };

    const handleMouseUp = (event: MouseEvent) => {
      event.preventDefault();
      stopResizing();
    };

    const handleMouseLeave = () => {
      stopResizing();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopResizing();
      }
    };

    const handleBlur = () => {
      stopResizing();
    };

    document.addEventListener("mousemove", handleMouseMove, { passive: false });
    document.addEventListener("mouseup", handleMouseUp, { passive: false });
    document.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);

    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
    };
  }, [enabled, onResize, stopResizing]);

  return { isResizing, handleMouseDown };
};
