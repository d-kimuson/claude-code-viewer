import type { FC, ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLayoutPanels } from "@/hooks/useLayoutPanels";
import { cn } from "@/lib/utils";

// Icon menu width (w-12 = 3rem = 48px)
const ICON_MENU_WIDTH = 48;
// Minimum width for content area
const MIN_CONTENT_WIDTH = 200;

interface ResizableSidebarProps {
  children: ReactNode;
  className?: string;
}

export const ResizableSidebar: FC<ResizableSidebarProps> = ({
  children,
  className,
}) => {
  const { isLeftPanelOpen, leftPanelWidth, setLeftPanelWidth } =
    useLayoutPanels();

  const [isResizing, setIsResizing] = useState(false);
  const isResizingRef = useRef(false);

  const stopResizing = useCallback(() => {
    isResizingRef.current = false;
    setIsResizing(false);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isResizingRef.current = true;
    setIsResizing(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return;
      e.preventDefault();

      const newWidth = (e.clientX / window.innerWidth) * 100;
      setLeftPanelWidth(newWidth);
    };

    const handleMouseUp = (e: MouseEvent) => {
      e.preventDefault();
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
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
    };
  }, [stopResizing, setLeftPanelWidth]);

  useEffect(() => {
    if (isResizing) {
      document.body.style.userSelect = "none";
      document.body.style.cursor = "ew-resize";
      document.body.style.pointerEvents = "none";
    } else {
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      document.body.style.pointerEvents = "";
    }

    return () => {
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      document.body.style.pointerEvents = "";
    };
  }, [isResizing]);

  // When content is hidden, only show icon menu (48px)
  // When content is shown, use percentage width with min/max constraints
  const sidebarWidth = isLeftPanelOpen
    ? `${leftPanelWidth}%`
    : `${ICON_MENU_WIDTH}px`;

  const minWidth = isLeftPanelOpen
    ? `${ICON_MENU_WIDTH + MIN_CONTENT_WIDTH}px`
    : `${ICON_MENU_WIDTH}px`;

  return (
    <div
      className={cn(
        "relative flex-shrink-0 h-full hidden md:flex overflow-hidden transition-all duration-200",
        className,
      )}
      style={{
        width: sidebarWidth,
        minWidth,
        maxWidth: isLeftPanelOpen ? "50%" : `${ICON_MENU_WIDTH}px`,
        userSelect: isResizing ? "none" : "auto",
      }}
    >
      <div className="w-full h-full overflow-hidden">{children}</div>

      {/* Resize handle - only show when content is visible */}
      {isLeftPanelOpen && (
        <div
          className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-primary/40 active:bg-primary transition-colors z-10"
          style={{ pointerEvents: "auto" }}
          onMouseDown={handleMouseDown}
        />
      )}
    </div>
  );
};
