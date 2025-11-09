import { FileSystem, Path } from "@effect/platform";
import { Context, Effect, Layer } from "effect";
import { z } from "zod";
import type { InferEffect } from "../../../lib/effect/types";
import { ApplicationContext } from "../../platform/services/ApplicationContext";

// Zod schema for process PID metadata
const ProcessPidMetadataSchema = z.object({
  pid: z.number().int().positive(),
  sessionProcessId: z.string(),
  projectId: z.string(),
  cwd: z.string(),
  createdAt: z.string().datetime(),
});

export type ProcessPidMetadata = z.infer<typeof ProcessPidMetadataSchema>;

// Zod schema for the entire PID file
const ProcessPidsFileSchema = z.object({
  processes: z.record(z.string(), ProcessPidMetadataSchema),
});

export type ProcessPidsFile = z.infer<typeof ProcessPidsFileSchema>;

const LayerImpl = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const context = yield* ApplicationContext;

  const pidFilePath = context.claudeCodeViewerPaths.processPidsFilePath;
  const pidDirPath = path.dirname(pidFilePath);

  // Ensure the directory exists
  const ensureDirectory = () =>
    Effect.gen(function* () {
      const dirExists = yield* fs.exists(pidDirPath);
      if (!dirExists) {
        yield* fs.makeDirectory(pidDirPath, { recursive: true });
      }
    });

  // Read the PID file, returning empty structure if it doesn't exist or is invalid
  const readPidFile = () =>
    Effect.gen(function* () {
      yield* ensureDirectory();

      const fileExists = yield* fs.exists(pidFilePath);
      if (!fileExists) {
        return { processes: {} } satisfies ProcessPidsFile;
      }

      const content = yield* fs
        .readFileString(pidFilePath)
        .pipe(Effect.catchAll(() => Effect.succeed("{}")));

      const parsed = (() => {
        try {
          return ProcessPidsFileSchema.parse(JSON.parse(content));
        } catch (error) {
          console.error(`PID file parse error: ${error}`);
          return undefined;
        }
      })();

      return parsed ?? { processes: {} };
    });

  // Write the PID file
  // TODO: Consider atomic writes (tmp file + rename) for better crash safety
  // Current implementation: direct write, with recovery logic in readPidFile
  const writePidFile = (data: ProcessPidsFile) =>
    Effect.gen(function* () {
      yield* ensureDirectory();
      yield* fs.writeFileString(pidFilePath, JSON.stringify(data, null, 2));
    });

  const savePid = (
    sessionProcessId: string,
    pid: number,
    metadata: {
      projectId: string;
      cwd: string;
    },
  ) =>
    Effect.gen(function* () {
      const data = yield* readPidFile();

      const newMetadata: ProcessPidMetadata = {
        pid,
        sessionProcessId,
        projectId: metadata.projectId,
        cwd: metadata.cwd,
        createdAt: new Date().toISOString(),
      };

      data.processes[sessionProcessId] = newMetadata;
      yield* writePidFile(data);

      return newMetadata;
    });

  const removePid = (sessionProcessId: string) =>
    Effect.gen(function* () {
      const data = yield* readPidFile();
      const metadata = data.processes[sessionProcessId];

      delete data.processes[sessionProcessId];
      yield* writePidFile(data);

      return metadata ?? null;
    });

  const getPid = (sessionProcessId: string) =>
    Effect.gen(function* () {
      const data = yield* readPidFile();
      return data.processes[sessionProcessId] ?? null;
    });

  const getAllPids = () =>
    Effect.gen(function* () {
      const data = yield* readPidFile();
      return Object.values(data.processes);
    });

  const clearAllPids = () =>
    Effect.gen(function* () {
      yield* writePidFile({ processes: {} });
    });

  return {
    savePid,
    removePid,
    getPid,
    getAllPids,
    clearAllPids,
  };
});

export type IProcessPidRepository = InferEffect<typeof LayerImpl>;

export class ProcessPidRepository extends Context.Tag("ProcessPidRepository")<
  ProcessPidRepository,
  IProcessPidRepository
>() {
  static Live = Layer.effect(this, LayerImpl);
}
