import type { IncomingMessage } from "node:http";
import type { ServerType } from "@hono/node-server";
import { Effect, Runtime } from "effect";
import WebSocket, { WebSocketServer } from "ws";
import { TerminalService } from "../core/terminal/TerminalService";
import { AuthMiddleware } from "../hono/middleware/auth.middleware";

type ServerMessage =
  | { type: "hello"; sessionId: string; seq: number }
  | { type: "output"; seq: number; data: string }
  | { type: "snapshot"; seq: number; data: string }
  | { type: "exit"; code: number }
  | { type: "pong" };

type ClientMessage =
  | { type: "input"; data: string }
  | { type: "resize"; cols: number; rows: number }
  | { type: "signal"; name: string }
  | { type: "sync"; lastSeq: number }
  | { type: "ping" };

const parseCookies = (cookieHeader: string | undefined) => {
  const result: Record<string, string> = {};
  if (!cookieHeader) return result;
  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const [rawKey, ...rest] = part.trim().split("=");
    if (!rawKey) continue;
    result[rawKey] = rest.join("=");
  }
  return result;
};

const parseClientMessage = (payload: string): ClientMessage | undefined => {
  try {
    const parsed = JSON.parse(payload);
    if (!parsed || typeof parsed !== "object") return undefined;
    if (parsed.type === "input" && typeof parsed.data === "string") {
      return { type: "input", data: parsed.data };
    }
    if (
      parsed.type === "resize" &&
      typeof parsed.cols === "number" &&
      typeof parsed.rows === "number"
    ) {
      return { type: "resize", cols: parsed.cols, rows: parsed.rows };
    }
    if (parsed.type === "signal" && typeof parsed.name === "string") {
      return { type: "signal", name: parsed.name };
    }
    if (parsed.type === "sync" && typeof parsed.lastSeq === "number") {
      return { type: "sync", lastSeq: parsed.lastSeq };
    }
    if (parsed.type === "ping") {
      return { type: "ping" };
    }
  } catch {
    return undefined;
  }
  return undefined;
};

const sendJson = (client: WebSocket, payload: ServerMessage) => {
  if (client.readyState !== WebSocket.OPEN) return;
  client.send(JSON.stringify(payload));
};

const baseUrlForRequest = (req: IncomingMessage) => {
  const host = req.headers.host ?? "localhost";
  return `http://${host}`;
};

export const setupTerminalWebSocket = (server: ServerType) =>
  Effect.gen(function* () {
    const terminalService = yield* TerminalService;
    const authMiddlewareService = yield* AuthMiddleware;
    const { authEnabled, validSessionToken } = yield* authMiddlewareService;
    const runtime = yield* Effect.runtime<TerminalService>();
    const runPromise = Runtime.runPromise(runtime);

    const wss = new WebSocketServer({ noServer: true });

    server.on("upgrade", (req, socket, head) => {
      const url = new URL(req.url ?? "/", baseUrlForRequest(req));
      if (url.pathname !== "/ws/terminal") return;

      if (authEnabled) {
        const cookies = parseCookies(req.headers.cookie);
        if (cookies["ccv-session"] !== validSessionToken) {
          socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
          socket.destroy();
          return;
        }
      }

      wss.handleUpgrade(req, socket, head, (ws: WebSocket) => {
        wss.emit("connection", ws, req);
      });
    });

    wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
      const url = new URL(req.url ?? "/", baseUrlForRequest(req));
      const sessionIdParam = url.searchParams.get("sessionId");
      const requestedSessionId =
        sessionIdParam && sessionIdParam.length > 0
          ? sessionIdParam
          : undefined;

      runPromise(terminalService.getOrCreateSession(requestedSessionId))
        .then((session) => {
          sendJson(ws, {
            type: "hello",
            sessionId: session.id,
            seq: session.seq,
          });
          return runPromise(
            terminalService.registerClient(session.id, ws),
          ).then(() => session);
        })
        .then((session) => {
          ws.on("message", (data: WebSocket.RawData) => {
            const text =
              typeof data === "string"
                ? data
                : data instanceof Buffer
                  ? data.toString("utf8")
                  : undefined;
            if (!text) return;
            const message = parseClientMessage(text);
            if (!message) return;
            if (message.type === "input") {
              void runPromise(
                terminalService.writeInput(session.id, message.data),
              );
              return;
            }
            if (message.type === "resize") {
              void runPromise(
                terminalService.resize(session.id, message.cols, message.rows),
              );
              return;
            }
            if (message.type === "signal") {
              void runPromise(terminalService.signal(session.id, message.name));
              return;
            }
            if (message.type === "sync") {
              void runPromise(
                terminalService.snapshotSince(session.id, message.lastSeq),
              ).then((snapshot) => {
                if (!snapshot) return;
                sendJson(ws, {
                  type: "snapshot",
                  seq: snapshot.seq,
                  data: snapshot.data,
                });
              });
              return;
            }
            if (message.type === "ping") {
              sendJson(ws, { type: "pong" });
            }
          });

          ws.on("close", () => {
            void runPromise(terminalService.unregisterClient(session.id, ws));
          });
        })
        .catch(() => {
          ws.close(1011, "Session initialization failed");
        });
    });
  });
