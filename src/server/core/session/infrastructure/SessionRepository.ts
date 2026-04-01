import { FileSystem } from "@effect/platform";
import { desc, eq, sql } from "drizzle-orm";
import { Context, Effect, Layer, Option } from "effect";
import { DrizzleService } from "../../../lib/db/DrizzleService";
import { projects, sessions } from "../../../lib/db/schema";
import type { InferEffect } from "../../../lib/effect/types";
import { parseJsonl } from "../../claude-code/functions/parseJsonl";
import { ApplicationContext } from "../../platform/services/ApplicationContext";
import {
  decodeProjectId,
  validateProjectPath,
} from "../../project/functions/id";
import { SyncService } from "../../sync/services/SyncService";
import type { Session, SessionDetail } from "../../types";
import { decodeSessionId, validateSessionId } from "../functions/id";
import { SessionMetaService } from "../services/SessionMetaService";

const LayerImpl = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const sessionMetaService = yield* SessionMetaService;
  const appContext = yield* ApplicationContext;
  const { db } = yield* DrizzleService;
  const syncService = yield* SyncService;

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

      // Ensure project is synced in DB
      const projectExists = db
        .select({ one: sql<number>`1` })
        .from(projects)
        .where(eq(projects.id, projectId))
        .get();
      if (!projectExists) {
        yield* syncService
          .syncProjectList(projectId)
          .pipe(Effect.catchAll(() => Effect.void));
      }

      // Fetch all sessions for project ordered by lastModifiedAt DESC
      const rows = db
        .select()
        .from(sessions)
        .where(eq(sessions.projectId, projectId))
        .orderBy(desc(sessions.lastModifiedAt))
        .all();

      if (rows.length === 0) {
        return { sessions: [] };
      }

      // Cursor-based pagination
      const startIndex =
        cursor !== undefined
          ? (() => {
              const idx = rows.findIndex((r) => r.id === cursor);
              return idx === -1 ? 0 : idx + 1;
            })()
          : 0;

      const sessionsToReturn = rows.slice(startIndex, startIndex + maxCount);

      const sessionsResult: Session[] = yield* Effect.all(
        sessionsToReturn.map((row) =>
          Effect.gen(function* () {
            const meta = yield* sessionMetaService.getSessionMeta(
              projectId,
              row.id,
            );
            return {
              id: row.id,
              jsonlFilePath: row.filePath,
              lastModifiedAt: new Date(row.lastModifiedAt),
              meta,
            } satisfies Session;
          }),
        ),
        { concurrency: "unbounded" },
      );

      return { sessions: sessionsResult };
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
