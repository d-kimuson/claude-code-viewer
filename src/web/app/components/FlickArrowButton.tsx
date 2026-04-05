import { MoveIcon } from "lucide-react";
import { type FC, type TouchEvent, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Direction = "up" | "down" | "left" | "right";

const ARROW_KEYS: Record<Direction, string> = {
  up: "\x1b[A",
  down: "\x1b[B",
  left: "\x1b[D",
  right: "\x1b[C",
};

const DIRECTION_LABELS: Record<Direction, string> = {
  up: "↑",
  down: "↓",
  left: "←",
  right: "→",
};

const LONG_PRESS_MS = 300;
const FLICK_THRESHOLD_PX = 15;

type FlickArrowButtonProps = {
  onSendData: (data: string) => void;
};

/**
 * Compact arrow key input for mobile.
 *
 * - **Tap / click**: toggles a d-pad popup with ↑↓←→ buttons.
 * - **Long-press + drag (touch)**: flick in a direction to send an arrow key.
 */
export const FlickArrowButton: FC<FlickArrowButtonProps> = ({ onSendData }) => {
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [flickDirection, setFlickDirection] = useState<Direction | null>(null);
  const [isFlickMode, setIsFlickMode] = useState(false);
  const [popupPos, setPopupPos] = useState<{ x: number; y: number } | null>(null);

  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const isFlickModeRef = useRef(false);
  const suppressClickRef = useRef(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current !== undefined) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  // Close popup on outside click
  useEffect(() => {
    if (!isPopupOpen) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target;
      if (!(target instanceof Node)) return;
      if (buttonRef.current?.contains(target) === true) return;
      if (popupRef.current?.contains(target) === true) return;
      setIsPopupOpen(false);
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [isPopupOpen]);

  const detectDirection = useCallback(
    (startX: number, startY: number, endX: number, endY: number): Direction | null => {
      const dx = endX - startX;
      const dy = endY - startY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < FLICK_THRESHOLD_PX) return null;

      if (Math.abs(dx) > Math.abs(dy)) {
        return dx > 0 ? "right" : "left";
      }
      return dy > 0 ? "down" : "up";
    },
    [],
  );

  const resetFlick = useCallback(() => {
    if (longPressTimerRef.current !== undefined) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = undefined;
    }
    isFlickModeRef.current = false;
    setIsFlickMode(false);
    setFlickDirection(null);
    startPosRef.current = null;
  }, []);

  // Compute popup position from button bounding rect
  const updatePopupPos = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPopupPos({
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
  }, []);

  // --- Touch events for flick gesture ---

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    startPosRef.current = { x: touch.clientX, y: touch.clientY };
    setFlickDirection(null);

    longPressTimerRef.current = setTimeout(() => {
      isFlickModeRef.current = true;
      setIsFlickMode(true);
      setIsPopupOpen(false);
    }, LONG_PRESS_MS);
  }, []);

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch || !startPosRef.current) return;

      // If moved significantly before long-press timer, cancel it
      const dist = Math.sqrt(
        (touch.clientX - startPosRef.current.x) ** 2 + (touch.clientY - startPosRef.current.y) ** 2,
      );
      if (!isFlickModeRef.current && dist > FLICK_THRESHOLD_PX) {
        if (longPressTimerRef.current !== undefined) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = undefined;
        }
        return;
      }

      if (!isFlickModeRef.current) return;
      const dir = detectDirection(
        startPosRef.current.x,
        startPosRef.current.y,
        touch.clientX,
        touch.clientY,
      );
      setFlickDirection(dir);
    },
    [detectDirection],
  );

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (isFlickModeRef.current && startPosRef.current) {
        const touch = e.changedTouches[0];
        if (touch) {
          const dir = detectDirection(
            startPosRef.current.x,
            startPosRef.current.y,
            touch.clientX,
            touch.clientY,
          );
          if (dir) {
            onSendData(ARROW_KEYS[dir]);
          }
        }
        // Suppress the click that follows touchend
        suppressClickRef.current = true;
      }
      resetFlick();
    },
    [detectDirection, onSendData, resetFlick],
  );

  const handleTouchCancel = useCallback(() => {
    resetFlick();
  }, [resetFlick]);

  // --- Click for tap (popup toggle) ---

  const handleClick = useCallback(() => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    updatePopupPos();
    setIsPopupOpen((prev) => !prev);
  }, [updatePopupPos]);

  // Prevent context menu on long-press (mobile)
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  const handleDirectionTap = useCallback(
    (dir: Direction) => {
      onSendData(ARROW_KEYS[dir]);
    },
    [onSendData],
  );

  return (
    <div className="relative flex-shrink-0">
      {/* Main button */}
      <button
        ref={buttonRef}
        type="button"
        className={`flex items-center justify-center min-w-[32px] h-7 rounded border text-muted-foreground transition-colors flex-shrink-0 select-none ${
          isFlickMode
            ? "border-primary bg-primary/10"
            : isPopupOpen
              ? "border-primary/60 bg-muted"
              : "border-border/60 active:bg-muted"
        }`}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        aria-label="Arrow keys (tap for d-pad, long-press and drag to flick)"
      >
        <MoveIcon className="w-3.5 h-3.5" />
      </button>

      {/* Flick direction indicator (portal) */}
      {isFlickMode &&
        flickDirection !== null &&
        buttonRef.current &&
        createPortal(
          <div
            className="fixed bg-primary text-primary-foreground text-xs font-mono px-2 py-0.5 rounded pointer-events-none whitespace-nowrap z-[9999]"
            style={{
              left:
                buttonRef.current.getBoundingClientRect().left +
                buttonRef.current.getBoundingClientRect().width / 2,
              top: buttonRef.current.getBoundingClientRect().top - 32,
              transform: "translateX(-50%)",
            }}
          >
            {DIRECTION_LABELS[flickDirection]}
          </div>,
          document.body,
        )}

      {/* D-pad popup (portal to escape overflow clipping) */}
      {isPopupOpen &&
        !isFlickMode &&
        popupPos !== null &&
        createPortal(
          <div
            ref={popupRef}
            className="fixed z-[9999]"
            style={{
              left: popupPos.x,
              top: popupPos.y - 8,
              transform: "translate(-50%, -100%)",
            }}
          >
            <div className="bg-background border border-border rounded-lg shadow-lg p-1 grid grid-cols-3 grid-rows-3 gap-0.5 w-[84px] h-[84px]">
              {/* Row 1: _ ↑ _ */}
              <div />
              <DPadButton direction="up" onTap={handleDirectionTap} />
              <div />
              {/* Row 2: ← _ → */}
              <DPadButton direction="left" onTap={handleDirectionTap} />
              <div />
              <DPadButton direction="right" onTap={handleDirectionTap} />
              {/* Row 3: _ ↓ _ */}
              <div />
              <DPadButton direction="down" onTap={handleDirectionTap} />
              <div />
            </div>
            {/* Arrow triangle pointing down */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-border" />
          </div>,
          document.body,
        )}
    </div>
  );
};

type DPadButtonProps = {
  direction: Direction;
  onTap: (direction: Direction) => void;
};

const DPadButton: FC<DPadButtonProps> = ({ direction, onTap }) => (
  <button
    type="button"
    className="flex items-center justify-center rounded bg-muted/60 text-muted-foreground active:bg-primary/20 active:text-foreground text-sm font-mono transition-colors"
    onClick={(e) => {
      e.stopPropagation();
      onTap(direction);
    }}
    aria-label={`Arrow ${direction}`}
  >
    {DIRECTION_LABELS[direction]}
  </button>
);
