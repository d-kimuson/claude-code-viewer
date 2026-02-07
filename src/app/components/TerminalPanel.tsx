import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import type { FC } from "react";
import { useEffect, useRef } from "react";
import "@xterm/xterm/css/xterm.css";

type ServerMessage =
  | { type: "hello"; sessionId: string; seq: number }
  | { type: "output"; seq: number; data: string }
  | { type: "snapshot"; seq: number; data: string }
  | { type: "exit"; code: number }
  | { type: "pong" };

const SESSION_ID_KEY = "terminalSessionId";

const parseServerMessage = (payload: string): ServerMessage | undefined => {
  try {
    const parsed = JSON.parse(payload);
    if (!parsed || typeof parsed !== "object") return undefined;
    if (
      parsed.type === "hello" &&
      typeof parsed.sessionId === "string" &&
      typeof parsed.seq === "number"
    ) {
      return { type: "hello", sessionId: parsed.sessionId, seq: parsed.seq };
    }
    if (
      (parsed.type === "output" || parsed.type === "snapshot") &&
      typeof parsed.seq === "number" &&
      typeof parsed.data === "string"
    ) {
      return { type: parsed.type, seq: parsed.seq, data: parsed.data };
    }
    if (parsed.type === "exit" && typeof parsed.code === "number") {
      return { type: "exit", code: parsed.code };
    }
    if (parsed.type === "pong") {
      return { type: "pong" };
    }
  } catch {
    return undefined;
  }
  return undefined;
};

const getSessionIdStorageKey = (cwd: string | undefined) => {
  if (!cwd) return SESSION_ID_KEY;
  return `${SESSION_ID_KEY}:${cwd}`;
};

const getStoredSessionId = (cwd: string | undefined) => {
  const value = localStorage.getItem(getSessionIdStorageKey(cwd));
  return value && value.length > 0 ? value : undefined;
};

const buildWebSocketUrl = (
  sessionId: string | undefined,
  cwd: string | undefined,
) => {
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const host = window.location.host;
  const searchParams = new URLSearchParams();
  if (sessionId) {
    searchParams.set("sessionId", sessionId);
  }
  if (cwd) {
    searchParams.set("cwd", cwd);
  }
  const query = searchParams.toString();
  return `${protocol}://${host}/ws/terminal${query ? `?${query}` : ""}`;
};

type TerminalPanelProps = {
  resetToken?: number;
  cwd?: string;
};

const clearStoredSession = (cwd: string | undefined) => {
  localStorage.removeItem(getSessionIdStorageKey(cwd));
};

export const TerminalPanel: FC<TerminalPanelProps> = ({
  resetToken = 0,
  cwd,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const sessionIdRef = useRef<string | undefined>(undefined);
  const lastSeqRef = useRef<number>(0);
  const refreshRequestedRef = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (resetToken > 0) {
      clearStoredSession(cwd);
    }

    const term = new Terminal({
      convertEol: true,
      cursorBlink: true,
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas",
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(container);
    const fitAndRefresh = () => {
      fit.fit();
      if (term.rows > 0) {
        term.refresh(0, term.rows - 1);
      }
    };
    const scheduleRefresh = () => {
      if (refreshRequestedRef.current) return;
      refreshRequestedRef.current = true;
      requestAnimationFrame(() => {
        refreshRequestedRef.current = false;
        if (term.rows > 0) {
          term.refresh(0, term.rows - 1);
        }
      });
    };
    fitAndRefresh();
    requestAnimationFrame(() => {
      fitAndRefresh();
    });

    terminalRef.current = term;
    fitRef.current = fit;

    const storedSessionId = getStoredSessionId(cwd);
    sessionIdRef.current = storedSessionId;
    lastSeqRef.current = 0;

    const socket = new WebSocket(buildWebSocketUrl(storedSessionId, cwd));
    socketRef.current = socket;

    const sendJson = (payload: object) => {
      if (socket.readyState !== WebSocket.OPEN) return;
      socket.send(JSON.stringify(payload));
    };

    const sendResize = () => {
      sendJson({ type: "resize", cols: term.cols, rows: term.rows });
    };

    socket.addEventListener("open", () => {
      sendJson({ type: "sync", lastSeq: lastSeqRef.current });
      fitAndRefresh();
      sendResize();
    });

    socket.addEventListener("message", (event) => {
      if (typeof event.data !== "string") return;
      const message = parseServerMessage(event.data);
      if (!message) return;
      if (message.type === "hello") {
        sessionIdRef.current = message.sessionId;
        localStorage.setItem(getSessionIdStorageKey(cwd), message.sessionId);
        return;
      }
      if (message.type === "output" || message.type === "snapshot") {
        term.write(message.data);
        scheduleRefresh();
        lastSeqRef.current = message.seq;
        return;
      }
      if (message.type === "exit") {
        term.write(`\r\n[process exited with code ${message.code}]\r\n`);
        return;
      }
    });

    const dataDisposable = term.onData((data) => {
      sendJson({ type: "input", data });
    });

    const keyDisposable = term.onKey(({ domEvent }) => {
      if (domEvent.ctrlKey && domEvent.key.toLowerCase() === "c") {
        domEvent.preventDefault();
        domEvent.stopPropagation();
        sendJson({ type: "signal", name: "SIGINT" });
      }
    });

    const resizeObserver = new ResizeObserver(() => {
      fitAndRefresh();
      sendResize();
    });
    resizeObserver.observe(container);

    const pingInterval = window.setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "ping" }));
      }
    }, 20_000);

    return () => {
      window.clearInterval(pingInterval);
      resizeObserver.disconnect();
      dataDisposable.dispose();
      keyDisposable.dispose();
      socket.close();
      term.dispose();
    };
  }, [resetToken, cwd]);

  return <div ref={containerRef} className="h-full w-full" />;
};
