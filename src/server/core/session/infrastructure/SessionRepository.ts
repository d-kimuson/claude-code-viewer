import { FileSystem, Path } from "@effect/platform";
import { Context, Effect, Layer, Option } from "effect";
import type { InferEffect } from "../../../lib/effect/types";
import { parseJsonl } from "../../claude-code/functions/parseJsonl";
import { ApplicationContext } from "../../platform/services/ApplicationContext";
import {
  decodeProjectId,
  validateProjectPath,
} from "../../project/functions/id";
import type { Session, SessionDetail } from "../../types";
import {
  decodeSessionId,
  encodeSessionId,
  validateSessionId,
} from "../functions/id";
import { isRegularSessionFile } from "../functions/isRegularSessionFile";
import { SessionMetaService } from "../services/SessionMetaService";

const LayerImpl = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const sessionMetaService = yield* SessionMetaService;
  const appContext = yield* ApplicationContext;

  const getSession = (projectId: string, sessionId: string) =>
    Effect.gen(function* () {
      // Validate sessionId contains only safe characters
      if (!validateSessionId(sessionId)) {
        return yield* Effect.fail(
          new Error("Invalid session ID: contains unsafe characters"),
        );
      }

      // Validate that the project path is within the Claude projects directory
      const projectPath = decodeProjectId(projectId);
      const { claudeProjectsDirPath } = yield* appContext.claudeCodePaths;
      if (!validateProjectPath(projectPath, claudeProjectsDirPath)) {
        return yield* Effect.fail(
          new Error("Invalid project path: outside allowed directory"),
        );
      }

      const sessionPath = decodeSessionId(projectId, sessionId);

      // Check if session file exists
      const exists = yield* fs.exists(sessionPath);
      if (!exists) {
        return { session: null };
      }

      const sessionDetail = yield* Effect.gen(function* () {
        // Read session file
        const content = yield* fs.readFileString(sessionPath);
        const allLines = content.split("\n").filter((line) => line.trim());

        const conversations = parseJsonl(allLines.join("\n"));

        // Get file stats
        const stat = yield* fs.stat(sessionPath);

        // Get session metadata
        const meta = yield* sessionMetaService.getSessionMeta(
          projectId,
          sessionId,
        );

        const sessionDetail: SessionDetail = {
          id: sessionId,
          jsonlFilePath: sessionPath,
          meta,
          conversations,
          lastModifiedAt: Option.getOrElse(stat.mtime, () => new Date()),
        };

        return sessionDetail;
      });

      return {
        session: sessionDetail,
      };
    });

  const getSessions = (
    projectId: string,
    options?: {
      maxCount?: number;
      cursor?: string;
    },
  ) =>
    Effect.gen(function* () {
      const { maxCount = 20, cursor } = options ?? {};

      const claudeProjectPath = decodeProjectId(projectId);

      // Validate that the project path is within the Claude projects directory
      const { claudeProjectsDirPath } = yield* appContext.claudeCodePaths;
      if (!validateProjectPath(claudeProjectPath, claudeProjectsDirPath)) {
        return yield* Effect.fail(
          new Error("Invalid project path: outside allowed directory"),
        );
      }

      // Check if project directory exists
      const dirExists = yield* fs.exists(claudeProjectPath);
      if (!dirExists) {
        console.warn(`Project directory not found at ${claudeProjectPath}`);
        return { sessions: [] };
      }

      // Read directory entries with error handling
      const dirents = yield* Effect.tryPromise({
        try: () => fs.readDirectory(claudeProjectPath).pipe(Effect.runPromise),
        catch: (error) => {
          console.warn(
            `Failed to read sessions for project ${projectId}:`,
            error,
          );
          return new Error("Failed to read directory");
        },
      }).pipe(Effect.catchAll(() => Effect.succeed([])));

      // Process session files (excluding agent-*.jsonl files)
      const sessionEffects = dirents.filter(isRegularSessionFile).map((entry) =>
        Effect.gen(function* () {
          const fullPath = path.resolve(claudeProjectPath, entry);
          const sessionId = encodeSessionId(fullPath);

          // Get file stats with error handling
          const stat = yield* Effect.tryPromise(() =>
            fs.stat(fullPath).pipe(Effect.runPromise),
          ).pipe(Effect.catchAll(() => Effect.succeed(null)));

          if (!stat) {
            return null;
          }

          return {
            id: sessionId,
            jsonlFilePath: fullPath,
            lastModifiedAt: Option.getOrElse(stat.mtime, () => new Date()),
          };
        }),
      );

      // Execute all effects in parallel and filter out nulls
      const sessionsWithNulls = yield* Effect.all(sessionEffects, {
        concurrency: "unbounded",
      });
      const sessions = sessionsWithNulls
        .filter((s): s is NonNullable<typeof s> => s !== null)
        .sort(
          (a, b) => b.lastModifiedAt.getTime() - a.lastModifiedAt.getTime(),
        );

      const index =
        cursor !== undefined
          ? sessions.findIndex((session) => session.id === cursor)
          : -1;

      if (index !== -1) {
        const sessionsToReturn = sessions.slice(
          index + 1,
          Math.min(index + 1 + maxCount, sessions.length),
        );

        const sessionsWithMeta = yield* Effect.all(
          sessionsToReturn.map((item) =>
            Effect.gen(function* () {
              const meta = yield* sessionMetaService.getSessionMeta(
                projectId,
                item.id,
              );
              return {
                ...item,
                meta,
              };
            }),
          ),
          { concurrency: "unbounded" },
        );

        return {
          sessions: sessionsWithMeta,
        };
      }

      // Get sessions with metadata
      const sessionsToReturn = sessions.slice(
        0,
        Math.min(maxCount, sessions.length),
      );
      const sessionsWithMeta: Session[] = yield* Effect.all(
        sessionsToReturn.map((item) =>
          Effect.gen(function* () {
            const meta = yield* sessionMetaService.getSessionMeta(
              projectId,
              item.id,
            );
            return {
              ...item,
              meta,
            };
          }),
        ),
        { concurrency: "unbounded" },
      );

      return {
        sessions: sessionsWithMeta,
      };
    });

  return {
    getSession,
    getSessions,
  };
});

export type ISessionRepository = InferEffect<typeof LayerImpl>;

export class SessionRepository extends Context.Tag("SessionRepository")<
  SessionRepository,
  ISessionRepository
>() {
  static Live = Layer.effect(this, LayerImpl);
}
