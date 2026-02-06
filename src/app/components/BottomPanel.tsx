import { Trans } from "@lingui/react";
import { RocketIcon, XIcon } from "lucide-react";
import type { FC } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLayoutPanels } from "@/hooks/useLayoutPanels";
import { cn } from "@/lib/utils";

export const BottomPanel: FC = () => {
  const {
    isBottomPanelOpen,
    bottomPanelHeight,
    setIsBottomPanelOpen,
    setBottomPanelHeight,
  } = useLayoutPanels();

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

      // Calculate height from bottom of viewport
      const newHeight =
        ((window.innerHeight - e.clientY) / window.innerHeight) * 100;
      setBottomPanelHeight(newHeight);
    };

    const handleMouseUp = (e: MouseEvent) => {
      e.preventDefault();
      stopResizing();
    };

    const handleMouseLeave = () => {
      stopResizing();
    };

    document.addEventListener("mousemove", handleMouseMove, { passive: false });
    document.addEventListener("mouseup", handleMouseUp, { passive: false });
    document.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [stopResizing, setBottomPanelHeight]);

  useEffect(() => {
    if (isResizing) {
      document.body.style.userSelect = "none";
      document.body.style.cursor = "ns-resize";
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

  if (!isBottomPanelOpen) return null;

  return (
    <div
      className="border-t border-border/60 bg-background flex flex-col"
      style={{
        height: `${bottomPanelHeight}%`,
        userSelect: isResizing ? "none" : "auto",
      }}
    >
      {/* Resize handle */}
      <div
        className="h-1 cursor-ns-resize hover:bg-primary/40 active:bg-primary transition-colors flex-shrink-0"
        style={{ pointerEvents: "auto" }}
        onMouseDown={handleMouseDown}
      />

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/40 bg-muted/20 flex-shrink-0">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <RocketIcon className="w-3.5 h-3.5" />
          <span>
            <Trans id="layout.bottom_panel.title" />
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsBottomPanelOpen(false)}
          className="w-5 h-5 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close bottom panel"
        >
          <XIcon className="w-3 h-3" />
        </button>
      </div>

      {/* Content - Coming Soon placeholder */}
      <div className="flex-1 flex items-center justify-center min-h-0 overflow-auto bg-muted/5">
        <div className="text-center space-y-3 px-8">
          <div
            className={cn(
              "w-16 h-16 mx-auto rounded-2xl flex items-center justify-center",
              "bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30",
            )}
          >
            <RocketIcon className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              <Trans id="layout.bottom_panel.coming_soon.title" />
            </p>
            <p className="text-xs text-muted-foreground">
              <Trans id="layout.bottom_panel.coming_soon.description" />
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            Coming Soon
          </div>
        </div>
      </div>
    </div>
  );
};
