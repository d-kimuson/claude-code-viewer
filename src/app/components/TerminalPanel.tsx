import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import { useEffect, useRef } from "react";
import "@xterm/xterm/css/xterm.css";

type ServerMessage =
  | { type: "hello"; sessionId: string; seq: number }
  | { type: "output"; seq: number; data: string }
  | { type: "snapshot"; seq: number; data: string }
  | { type: "exit"; code: number }
  | { type: "pong" };

const SESSION_ID_KEY = "terminalSessionId";
const LAST_SEQ_PREFIX = "terminalLastSeq";

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

const getStoredSessionId = () => {
  const value = localStorage.getItem(SESSION_ID_KEY);
  return value && value.length > 0 ? value : undefined;
};

const getStoredLastSeq = (sessionId: string | undefined) => {
  if (!sessionId) return 0;
  const value = localStorage.getItem(`${LAST_SEQ_PREFIX}:${sessionId}`);
  if (!value) return 0;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
};

const storeLastSeq = (sessionId: string, seq: number) => {
  localStorage.setItem(`${LAST_SEQ_PREFIX}:${sessionId}`, String(seq));
};

const buildWebSocketUrl = (sessionId: string | undefined) => {
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const host = window.location.host;
  const encoded = sessionId ? encodeURIComponent(sessionId) : "";
  return `${protocol}://${host}/ws/terminal?sessionId=${encoded}`;
};

type TerminalPanelProps = {
  resetToken?: number;
};

const clearStoredSession = () => {
  const storedSessionId = localStorage.getItem(SESSION_ID_KEY);
  if (storedSessionId) {
    localStorage.removeItem(`${LAST_SEQ_PREFIX}:${storedSessionId}`);
  }
  localStorage.removeItem(SESSION_ID_KEY);
};

export const TerminalPanel = ({ resetToken = 0 }: TerminalPanelProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const sessionIdRef = useRef<string | undefined>(undefined);
  const lastSeqRef = useRef<number>(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (resetToken > 0) {
      clearStoredSession();
    }

    const term = new Terminal({
      convertEol: true,
      cursorBlink: true,
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas",
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(container);
    fit.fit();

    terminalRef.current = term;
    fitRef.current = fit;

    const storedSessionId = getStoredSessionId();
    const storedLastSeq = getStoredLastSeq(storedSessionId);
    sessionIdRef.current = storedSessionId;
    lastSeqRef.current = storedLastSeq;

    const socket = new WebSocket(buildWebSocketUrl(storedSessionId));
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
      sendResize();
    });

    socket.addEventListener("message", (event) => {
      if (typeof event.data !== "string") return;
      const message = parseServerMessage(event.data);
      if (!message) return;
      if (message.type === "hello") {
        sessionIdRef.current = message.sessionId;
        localStorage.setItem(SESSION_ID_KEY, message.sessionId);
        return;
      }
      if (message.type === "output" || message.type === "snapshot") {
        term.write(message.data);
        lastSeqRef.current = message.seq;
        const sessionId = sessionIdRef.current;
        if (sessionId) {
          storeLastSeq(sessionId, message.seq);
        }
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
      fit.fit();
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
  }, [resetToken]);

  return <div ref={containerRef} className="h-full w-full" />;
};
