import { Trans } from "@lingui/react";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ClipboardPasteIcon,
  PanelBottomCloseIcon,
  RocketIcon,
  RotateCcwIcon,
} from "lucide-react";
import { type FC, useCallback, useEffect, useRef, useState } from "react";
import { useDragResize } from "@/web/hooks/useDragResize";
import { useIsMobile } from "@/web/hooks/useIsMobile";
import { useBottomPanelActions, useBottomPanelState } from "@/web/hooks/useLayoutPanels";
import { FlickArrowButton } from "./FlickArrowButton";
import { type TerminalHandle, TerminalPanel } from "./TerminalPanel";

type KeyDef =
  | { label: string; type: "data"; data: string }
  | { label: string; type: "signal"; signal: string };

const MOBILE_KEYS: readonly KeyDef[] = [
  { label: "Esc", type: "data", data: "\x1b" },
  { label: "Tab", type: "data", data: "\t" },
  { label: "Ctrl+C", type: "signal", signal: "SIGINT" },
  { label: "Ctrl+U", type: "data", data: "\x15" },
];

type BottomPanelProps = {
  cwd?: string;
};

export const BottomPanel: FC<BottomPanelProps> = ({ cwd }) => {
  const { isBottomPanelOpen, bottomPanelHeight } = useBottomPanelState();
  const { setIsBottomPanelOpen, setBottomPanelHeight } = useBottomPanelActions();
  const isMobile = useIsMobile();

  const [terminalResetToken, setTerminalResetToken] = useState(0);
  const collapseTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const terminalRef = useRef<TerminalHandle>(null);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (collapseTimerRef.current) {
        clearTimeout(collapseTimerRef.current);
      }
    };
  }, []);

  const handleProcessExit = useCallback(() => {
    // Delay collapse so user can see the exit message
    collapseTimerRef.current = setTimeout(() => {
      setIsBottomPanelOpen(false);
    }, 1500);
  }, [setIsBottomPanelOpen]);

  const handleResize = useCallback(
    (position: { clientX: number; clientY: number }) => {
      const newHeight = ((window.innerHeight - position.clientY) / window.innerHeight) * 100;
      setBottomPanelHeight(newHeight);
    },
    [setBottomPanelHeight],
  );

  const { isResizing, handleMouseDown, handleTouchStart } = useDragResize({
    onResize: handleResize,
  });

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

  const handleKeyPress = useCallback((key: KeyDef) => {
    if (key.type === "data") {
      terminalRef.current?.sendData(key.data);
    } else {
      terminalRef.current?.sendSignal(key.signal);
    }
  }, []);

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        terminalRef.current?.sendData(text);
      }
    } catch {
      // Clipboard access denied or not available
    }
  }, []);

  if (!isBottomPanelOpen) return null;

  return (
    <div
      className="border-t border-border/60 bg-background flex flex-col flex-shrink-0"
      style={{
        height: `${bottomPanelHeight}%`,
        userSelect: isResizing ? "none" : "auto",
      }}
    >
      {/* Resize handle */}
      {/* oxlint-disable-next-line jsx-a11y/no-static-element-interactions -- Resize handle is mouse/touch-only UI */}
      <div
        className="h-2 cursor-ns-resize hover:bg-primary/40 active:bg-primary transition-colors flex-shrink-0"
        style={{ pointerEvents: "auto", touchAction: "none" }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      />

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/40 bg-muted/20 flex-shrink-0">
        {isMobile ? (
          <>
            {/* Mobile: icon-only buttons + shortcut keys in header */}
            <div className="flex items-center gap-1 overflow-x-auto flex-1 min-w-0">
              <button
                type="button"
                onClick={() => setTerminalResetToken((value) => value + 1)}
                className="flex items-center justify-center min-w-[32px] h-7 rounded border border-border/60 text-muted-foreground active:bg-muted transition-colors flex-shrink-0"
                aria-label="Start a new terminal session"
              >
                <RotateCcwIcon className="w-3.5 h-3.5" />
              </button>

              <div className="w-px h-4 bg-border/60 mx-0.5 flex-shrink-0" />

              {/* Paste button */}
              <button
                type="button"
                className="flex items-center justify-center min-w-[32px] h-7 rounded border border-border/60 text-muted-foreground active:bg-muted transition-colors flex-shrink-0"
                onPointerDown={(e) => {
                  e.preventDefault();
                  void handlePaste();
                }}
                aria-label="Paste from clipboard"
              >
                <ClipboardPasteIcon className="w-3.5 h-3.5" />
              </button>

              {/* Arrow keys (flick / d-pad) */}
              <FlickArrowButton onSendData={(data) => terminalRef.current?.sendData(data)} />

              <div className="w-px h-4 bg-border/60 mx-0.5 flex-shrink-0" />

              {/* Key shortcut buttons */}
              {MOBILE_KEYS.map((key) => (
                <button
                  key={key.label}
                  type="button"
                  className="flex items-center justify-center min-w-[36px] h-7 px-1.5 rounded border border-border/60 text-[11px] font-mono text-muted-foreground active:bg-muted transition-colors flex-shrink-0"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    handleKeyPress(key);
                  }}
                >
                  {key.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setIsBottomPanelOpen(false)}
              className="w-7 h-7 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 ml-1"
              aria-label="Collapse terminal panel"
            >
              <PanelBottomCloseIcon className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <>
            {/* Desktop: original header */}
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <RocketIcon className="w-3.5 h-3.5" />
              <span>
                <Trans id="layout.bottom_panel.title" />
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setTerminalResetToken((value) => value + 1)}
                className="h-6 px-2 text-[11px] rounded border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center gap-1"
                aria-label="Start a new terminal session"
              >
                <RotateCcwIcon className="w-3 h-3" />
                New session
              </button>
              <button
                type="button"
                onClick={() => setIsBottomPanelOpen(false)}
                className="w-5 h-5 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Collapse terminal panel"
              >
                <PanelBottomCloseIcon className="w-3 h-3" />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 bg-muted/5 flex">
        <div className="flex-1 min-w-0">
          <TerminalPanel
            ref={terminalRef}
            resetToken={terminalResetToken}
            cwd={cwd}
            onProcessExit={handleProcessExit}
          />
        </div>
        {/* Scroll buttons on right side */}
        <div className="flex flex-col w-7 flex-shrink-0 border-l border-border/30">
          <button
            type="button"
            className="flex-1 flex items-center justify-center text-muted-foreground active:bg-muted hover:bg-muted/60 transition-colors"
            onPointerDown={(e) => {
              e.preventDefault();
              terminalRef.current?.scrollLines(-5);
            }}
            aria-label="Scroll up"
          >
            <ChevronUpIcon className="w-4 h-4" />
          </button>
          <div className="h-px bg-border/30 flex-shrink-0" />
          <button
            type="button"
            className="flex-1 flex items-center justify-center text-muted-foreground active:bg-muted hover:bg-muted/60 transition-colors"
            onPointerDown={(e) => {
              e.preventDefault();
              terminalRef.current?.scrollLines(5);
            }}
            aria-label="Scroll down"
          >
            <ChevronDownIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
