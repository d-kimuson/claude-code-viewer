import { type FC, type ReactNode, useCallback, useEffect } from "react";
import { useDragResize } from "@/web/hooks/useDragResize";
import { useIsMobile } from "@/web/hooks/useIsMobile";
import { useLeftPanelActions, useLeftPanelState } from "@/web/hooks/useLayoutPanels";
import { cn } from "@/web/utils";

// Desktop icon menu pixel width (must match --sidebar-icon-menu-width in styles.css)
const ICON_MENU_WIDTH_PX = 48;
// Minimum width for content area
const MIN_CONTENT_WIDTH = 200;

type ResizableSidebarProps = {
  children: ReactNode;
  className?: string;
};

export const ResizableSidebar: FC<ResizableSidebarProps> = ({ children, className }) => {
  const { isLeftPanelOpen, leftPanelWidth } = useLeftPanelState();
  const { setLeftPanelWidth } = useLeftPanelActions();
  const isMobile = useIsMobile();

  const handleResize = useCallback(
    (event: MouseEvent) => {
      const newWidth = (event.clientX / window.innerWidth) * 100;
      setLeftPanelWidth(newWidth);
    },
    [setLeftPanelWidth],
  );

  const { isResizing, handleMouseDown } = useDragResize({
    onResize: handleResize,
  });

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

  // On mobile, hide the icon menu entirely — MobileSidebar handles navigation
  if (isMobile) {
    return null;
  }

  // When content is hidden, only show icon menu (48px)
  // When content is shown, use percentage width with min/max constraints
  const sidebarWidth = isLeftPanelOpen ? `${leftPanelWidth}%` : `${ICON_MENU_WIDTH_PX}px`;

  const minWidth = isLeftPanelOpen
    ? `${ICON_MENU_WIDTH_PX + MIN_CONTENT_WIDTH}px`
    : `${ICON_MENU_WIDTH_PX}px`;

  return (
    <div
      className={cn(
        "relative flex-shrink-0 h-full flex overflow-hidden transition-all duration-200",
        className,
      )}
      style={{
        width: sidebarWidth,
        minWidth,
        maxWidth: isLeftPanelOpen ? "50%" : `${ICON_MENU_WIDTH_PX}px`,
        userSelect: isResizing ? "none" : "auto",
      }}
    >
      <div className="w-full h-full overflow-hidden">{children}</div>

      {/* Resize handle - only show when content is visible */}
      {isLeftPanelOpen && (
        <div
          role="separator"
          className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-primary/40 active:bg-primary transition-colors z-10"
          style={{ pointerEvents: "auto" }}
          onMouseDown={handleMouseDown}
        />
      )}
    </div>
  );
};
