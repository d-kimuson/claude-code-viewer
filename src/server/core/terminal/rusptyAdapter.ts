import type { Readable } from "node:stream";
import type { PtyOptions } from "@replit/ruspty";

type RusptyModule = typeof import("@replit/ruspty");

type TerminalPtyProcess = {
  write: (data: string) => void;
  resize: (cols: number, rows: number) => void;
  kill: () => void;
};

type TerminalPtySession = {
  process: TerminalPtyProcess;
  read: Readable;
};

const createRusptySession = (
  ruspty: RusptyModule,
  options: PtyOptions,
): TerminalPtySession => {
  const pty = new ruspty.Pty(options);

  return {
    process: {
      write: (data) => {
        pty.write.write(data);
      },
      resize: (cols, rows) => {
        pty.resize({ cols, rows });
      },
      kill: () => {
        pty.close();
      },
    },
    read: pty.read,
  };
};

export type { RusptyModule, TerminalPtyProcess, TerminalPtySession };
export { createRusptySession };
