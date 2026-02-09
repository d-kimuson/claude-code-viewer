import { Context, Effect, Layer } from "effect";
import { ulid } from "ulid";
import type WebSocket from "ws";
import type { InferEffect } from "../../lib/effect/types";
import { CcvOptionsService } from "../platform/services/CcvOptionsService";
import { EnvService } from "../platform/services/EnvService";
import { normalizePtyChunk } from "./normalizePtyChunk";
import {
  createRusptySession,
  type RusptyModule,
  type TerminalPtyProcess,
} from "./rusptyAdapter";

type PtyProcess = TerminalPtyProcess;

type TerminalOutputChunk = {
  seq: number;
  data: string;
};

type TerminalSession = {
  id: string;
  pty: PtyProcess;
  seq: number;
  buffer: TerminalOutputChunk[];
  bufferBytes: number;
  lastActivity: number;
  clients: Set<WebSocket>;
  exited: boolean;
  inputBuffer: string;
};

const DEFAULT_COLS = 80;
const DEFAULT_ROWS = 24;
const MAX_BUFFER_BYTES = 1024 * 1024 * 2;
const SESSION_TTL_MS = 30 * 60 * 1000;
const MAX_SESSIONS = 10;

const selectShell = (
  shellEnv: string | undefined,
  fallbackShell: string | undefined,
  unrestrictedFlag: boolean | undefined,
) => {
  if (process.platform === "win32") {
    return { command: "powershell.exe", args: ["-NoLogo"] };
  }
  const command = shellEnv ?? fallbackShell ?? "bash";
  const args: string[] = [];
  if (!unrestrictedFlag && command.toLowerCase().includes("bash")) {
    args.push("--noprofile", "--norc", "--restricted");
  }
  return { command, args };
};

const isFlagEnabled = (value: string | undefined) => {
  if (!value) return false;
  return value === "1" || value.toLowerCase() === "true";
};

const LayerImpl = Effect.gen(function* () {
  const envService = yield* EnvService;
  const ccvOptionsService = yield* CcvOptionsService;
  const sessions = new Map<string, TerminalSession>();

  const disabledService = (reason: string) => {
    const getOrCreateSession = (_sessionId?: string, _cwdOverride?: string) =>
      Effect.fail(new Error(`Terminal support is unavailable (${reason}).`));
    return {
      getOrCreateSession,
      registerClient: () => Effect.void,
      unregisterClient: () => Effect.void,
      writeInput: () => Effect.void,
      resize: () => Effect.void,
      signal: () => Effect.void,
      snapshotSince: () => Effect.succeed(undefined),
    };
  };

  const ruspty: RusptyModule | null = yield* Effect.tryPromise({
    try: () => import("@replit/ruspty"),
    catch: (error) =>
      new Error(`Failed to load @replit/ruspty: ${String(error)}`),
  }).pipe(
    Effect.catchAll((error) =>
      Effect.sync(() => {
        console.warn(error.message);
        return null;
      }),
    ),
  );

  if (!ruspty) {
    return disabledService("@replit/ruspty failed to load");
  }

  const trimBuffer = (session: TerminalSession) => {
    while (
      session.bufferBytes > MAX_BUFFER_BYTES &&
      session.buffer.length > 0
    ) {
      const removed = session.buffer.shift();
      if (removed) {
        session.bufferBytes -= Buffer.byteLength(removed.data, "utf8");
      }
    }
  };

  const sendJson = (client: WebSocket, payload: unknown) => {
    if (client.readyState !== 1) return;
    client.send(JSON.stringify(payload));
  };

  const broadcast = (session: TerminalSession, payload: unknown) => {
    for (const client of session.clients) {
      sendJson(client, payload);
    }
  };

  const destroySession = (sessionId: string) => {
    const session = sessions.get(sessionId);
    if (!session) return;
    sessions.delete(sessionId);
    session.exited = true;
    for (const client of session.clients) {
      if (client.readyState === 1) {
        client.close(1000, "Session closed");
      }
    }
    session.clients.clear();
    session.pty.kill();
  };

  const pruneSessions = () => {
    const now = Date.now();
    for (const [sessionId, session] of sessions.entries()) {
      if (session.clients.size > 0) {
        continue;
      }
      if (now - session.lastActivity > SESSION_TTL_MS) {
        destroySession(sessionId);
      }
    }
    if (sessions.size <= MAX_SESSIONS) return;
    const sorted = Array.from(sessions.values()).sort(
      (left, right) => left.lastActivity - right.lastActivity,
    );
    for (const session of sorted.slice(0, sessions.size - MAX_SESSIONS)) {
      destroySession(session.id);
    }
  };

  const createSession = (
    requestedId: string | undefined,
    options: {
      cwd: string;
      shell: string | undefined;
      fallbackShell: string | undefined;
      unrestrictedFlag: boolean | undefined;
      env: Record<string, string>;
    },
  ) => {
    const id = requestedId ?? ulid();
    const shell = selectShell(
      options.shell,
      options.fallbackShell,
      options.unrestrictedFlag,
    );
    const { process: ptyProcess, read } = createRusptySession(ruspty, {
      command: shell.command,
      args: shell.args,
      envs: options.env,
      dir: options.cwd,
      size: { cols: DEFAULT_COLS, rows: DEFAULT_ROWS },
      onExit: (_error, exitCode) => {
        const current = sessions.get(id);
        if (!current) return;
        current.exited = true;
        current.lastActivity = Date.now();
        broadcast(current, { type: "exit", code: exitCode });
        if (current.clients.size === 0) {
          destroySession(current.id);
        }
      },
    });
    const session: TerminalSession = {
      id,
      pty: ptyProcess,
      seq: 0,
      buffer: [],
      bufferBytes: 0,
      lastActivity: Date.now(),
      clients: new Set<WebSocket>(),
      exited: false,
      inputBuffer: "",
    };
    read.on("data", (chunk: unknown) => {
      const data = normalizePtyChunk(chunk);
      if (data === null) return;
      const current = sessions.get(session.id);
      if (!current || current.exited) return;
      current.lastActivity = Date.now();
      current.seq += 1;
      current.buffer.push({ seq: current.seq, data });
      current.bufferBytes += Buffer.byteLength(data, "utf8");
      trimBuffer(current);
      broadcast(current, {
        type: "output",
        seq: current.seq,
        data,
      });
    });
    sessions.set(id, session);
    return session;
  };

  const getSession = (sessionId: string | undefined) => {
    if (!sessionId) return undefined;
    return sessions.get(sessionId);
  };

  const getOrCreateSession = (
    sessionId: string | undefined,
    cwdOverride?: string,
  ) =>
    Effect.gen(function* () {
      const terminalDisabledEnv = yield* envService.getEnv(
        "CCV_TERMINAL_DISABLED",
      );
      const terminalDisabledOption =
        yield* ccvOptionsService.getCcvOptions("terminalDisabled");
      const terminalDisabled =
        terminalDisabledOption ?? isFlagEnabled(terminalDisabledEnv);
      if (terminalDisabled) {
        return yield* Effect.fail(
          new Error(
            "Terminal support is unavailable (CCV_TERMINAL_DISABLED is enabled).",
          ),
        );
      }
      const cwd = cwdOverride ?? process.cwd();
      const terminalShellOption =
        yield* ccvOptionsService.getCcvOptions("terminalShell");
      const shell =
        terminalShellOption ?? (yield* envService.getEnv("CCV_TERMINAL_SHELL"));
      const fallbackShell = yield* envService.getEnv("SHELL");
      const terminalUnrestrictedOption = yield* ccvOptionsService.getCcvOptions(
        "terminalUnrestricted",
      );
      const terminalUnrestrictedEnv = yield* envService.getEnv(
        "CCV_TERMINAL_UNRESTRICTED",
      );
      const unrestrictedFlag =
        terminalUnrestrictedOption ?? isFlagEnabled(terminalUnrestrictedEnv);
      const env = yield* envService.getAllEnv();
      const existing = getSession(sessionId);
      if (existing) {
        existing.lastActivity = Date.now();
        return existing;
      }
      return createSession(sessionId, {
        cwd,
        shell,
        fallbackShell,
        unrestrictedFlag,
        env,
      });
    });

  const registerClient = (sessionId: string, client: WebSocket) =>
    Effect.sync(() => {
      const session = getSession(sessionId);
      if (!session) {
        return;
      }
      session.clients.add(client);
      session.lastActivity = Date.now();
    });

  const unregisterClient = (sessionId: string, client: WebSocket) =>
    Effect.sync(() => {
      const session = getSession(sessionId);
      if (!session) {
        return;
      }
      session.clients.delete(client);
      session.lastActivity = Date.now();
      if (session.exited && session.clients.size === 0) {
        destroySession(session.id);
      }
    });

  const writeInput = (sessionId: string, data: string) =>
    Effect.sync(() => {
      const session = getSession(sessionId);
      if (!session || session.exited) return;
      session.lastActivity = Date.now();
      const combined = session.inputBuffer + data;
      const lines = combined.split(/\r\n|\n|\r/);
      session.inputBuffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.length > 0) {
          console.log(`[terminal] session ${session.id} command: ${trimmed}`);
        }
      }
      session.pty.write(data);
    });

  const resize = (sessionId: string, cols: number, rows: number) =>
    Effect.sync(() => {
      const session = getSession(sessionId);
      if (!session || session.exited) return;
      session.lastActivity = Date.now();
      session.pty.resize(cols, rows);
    });

  const signal = (sessionId: string, name: string) =>
    Effect.sync(() => {
      const session = getSession(sessionId);
      if (!session || session.exited) return;
      session.lastActivity = Date.now();
      if (name === "SIGINT") {
        session.pty.write("\x03");
      }
    });

  const snapshotSince = (sessionId: string, lastSeq: number) =>
    Effect.sync(() => {
      const session = getSession(sessionId);
      if (!session) return undefined;
      const chunks = session.buffer.filter((chunk) => chunk.seq > lastSeq);
      if (chunks.length === 0) return undefined;
      const data = chunks.map((chunk) => chunk.data).join("");
      return { seq: session.seq, data };
    });

  const cleanupLoop = Effect.forever(
    Effect.gen(function* () {
      yield* Effect.sleep("1 minute");
      pruneSessions();
    }),
  );
  yield* Effect.forkScoped(cleanupLoop);

  return {
    getOrCreateSession,
    registerClient,
    unregisterClient,
    writeInput,
    resize,
    signal,
    snapshotSince,
  };
});

export type ITerminalService = InferEffect<typeof LayerImpl>;

export class TerminalService extends Context.Tag("TerminalService")<
  TerminalService,
  ITerminalService
>() {
  static Live = Layer.effect(this, LayerImpl);
}
