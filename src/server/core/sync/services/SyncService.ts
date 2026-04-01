import { FileSystem, Path } from "@effect/platform";
import { count, eq } from "drizzle-orm";
import { Context, Effect, Layer, Option } from "effect";
import { z } from "zod";
import { DrizzleService } from "../../../lib/db/DrizzleService";
import { projects, sessions } from "../../../lib/db/schema";
import { parseJsonl } from "../../claude-code/functions/parseJsonl";
import { ApplicationContext } from "../../platform/services/ApplicationContext";
import { decodeProjectId, encodeProjectId } from "../../project/functions/id";
import { extractSearchableText } from "../../search/functions/extractSearchableText";
import { aggregateTokenUsageAndCost } from "../../session/functions/aggregateTokenUsageAndCost";
import { getAgentSessionFilesForSession } from "../../session/functions/getAgentSessionFilesForSession";
import { decodeSessionId, encodeSessionId } from "../../session/functions/id";
import { isRegularSessionFile } from "../../session/functions/isRegularSessionFile";
import { extractFirstUserMessage } from "../../session/functions/isValidFirstMessage";

// ---------------------------------------------------------------------------
// SyncService interface
// ---------------------------------------------------------------------------

export type ISyncService = {
  readonly fullSync: () => Effect.Effect<void, Error>;
  readonly syncSession: (projectId: string, sessionId: string) => Effect.Effect<void, Error>;
  readonly syncProjectList: (projectId: string) => Effect.Effect<void, Error>;
};

// ---------------------------------------------------------------------------
// Helper: extract actualSessionId from the first line of a JSONL file
// ---------------------------------------------------------------------------

const extractActualSessionId = (content: string): string | undefined => {
  const firstLine = content.split("\n")[0];
  if (firstLine === undefined || firstLine.trim() === "") {
    return undefined;
  }
  try {
    const parsed: unknown = JSON.parse(firstLine);
    const result = z.object({ sessionId: z.string() }).safeParse(parsed);
    if (result.success) {
      return result.data.sessionId;
    }
  } catch {
    // ignore parse errors
  }
  return undefined;
};

// ---------------------------------------------------------------------------
// Helper: extract project cwd from JSONL content
// The cwd field in JSONL entries represents the actual project working
// directory, which is distinct from the Claude projects log directory.
// ---------------------------------------------------------------------------

const extractCwdFromContent = (content: string): string | null => {
  const lines = content.split("\n");

  for (const line of lines) {
    const conversation = parseJsonl(line).at(0);
    if (
      conversation === undefined ||
      conversation.type === "summary" ||
      conversation.type === "x-error" ||
      conversation.type === "file-history-snapshot" ||
      conversation.type === "queue-operation" ||
      conversation.type === "custom-title" ||
      conversation.type === "agent-name" ||
      conversation.type === "pr-link" ||
      conversation.type === "last-prompt"
    ) {
      continue;
    }

    return conversation.cwd;
  }

  return null;
};

// ---------------------------------------------------------------------------
// LayerImpl
// ---------------------------------------------------------------------------

const LayerImpl = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const drizzleService = yield* DrizzleService;
  const appContext = yield* ApplicationContext;

  const { db, rawDb } = drizzleService;

  // -------------------------------------------------------------------------
  // Internal helper: extract project cwd
  // Tries sessions-index.json first (fast), falls back to parsing JSONL.
  // -------------------------------------------------------------------------

  const extractProjectCwd = (
    projectDirPath: string,
    sessionFileNames: string[],
  ): Effect.Effect<string | null, Error> =>
    Effect.gen(function* () {
      // 1. Try sessions-index.json (available in recent Claude Code versions)
      const indexPath = path.join(projectDirPath, "sessions-index.json");
      const indexContent = yield* fs
        .readFileString(indexPath)
        .pipe(Effect.catchAll(() => Effect.succeed("")));

      if (indexContent !== "") {
        try {
          const parsed: unknown = JSON.parse(indexContent);
          const indexSchema = z.object({
            entries: z.array(z.looseObject({ projectPath: z.string() })),
          });
          const indexResult = indexSchema.safeParse(parsed);
          if (indexResult.success) {
            for (const entry of indexResult.data.entries) {
              return entry.projectPath;
            }
          }
        } catch {
          // ignore parse errors, fall through to JSONL parsing
        }
      }

      // 2. Fallback: parse JSONL files (oldest first) for cwd field
      const fileEntries: Array<{ fullPath: string; mtimeMs: number }> = [];
      for (const fileName of sessionFileNames) {
        const fullPath = path.join(projectDirPath, fileName);
        const stat = yield* fs.stat(fullPath).pipe(Effect.catchAll(() => Effect.succeed(null)));
        if (stat) {
          const mtimeMs = Option.getOrElse(stat.mtime, () => new Date(0)).getTime();
          fileEntries.push({ fullPath, mtimeMs });
        }
      }

      fileEntries.sort((a, b) => a.mtimeMs - b.mtimeMs);

      for (const entry of fileEntries) {
        const content = yield* fs
          .readFileString(entry.fullPath)
          .pipe(Effect.catchAll(() => Effect.succeed("")));
        if (content === "") continue;

        const cwd = extractCwdFromContent(content);
        if (cwd !== null) {
          return cwd;
        }
      }

      return null;
    });

  // -------------------------------------------------------------------------
  // Internal helper: parse a JSONL file and upsert into DB
  // -------------------------------------------------------------------------

  const parseAndUpsertSession = (
    projectId: string,
    sessionId: string,
    filePath: string,
    fileMtimeMs: number,
  ): Effect.Effect<void, Error> =>
    Effect.gen(function* () {
      const content = yield* fs
        .readFileString(filePath)
        .pipe(
          Effect.mapError(
            (e) => new Error(`Failed to read session file ${filePath}: ${e.message}`),
          ),
        );
      const conversations = parseJsonl(content);

      // Extract firstUserMessage
      let firstUserMessage = null;
      for (const conversation of conversations) {
        const msg = extractFirstUserMessage(conversation);
        if (msg !== undefined) {
          firstUserMessage = msg;
          break;
        }
      }

      // Extract custom title and PR links
      let customTitle: string | null = null;
      const prLinksMap = new Map<
        string,
        { prNumber: number; prUrl: string; prRepository: string }
      >();

      for (const conversation of conversations) {
        if (conversation.type === "custom-title") {
          customTitle = conversation.customTitle;
        }
        if (conversation.type === "pr-link") {
          const key = `${conversation.prRepository}#${conversation.prNumber}`;
          prLinksMap.set(key, {
            prNumber: conversation.prNumber,
            prUrl: conversation.prUrl,
            prRepository: conversation.prRepository,
          });
        }
      }
      const prLinks = [...prLinksMap.values()];

      // Extract actual sessionId from file content to find agent sessions
      const actualSessionId = extractActualSessionId(content);
      const projectPath = path.dirname(filePath);

      // Discover agent session files
      const agentFilePaths =
        actualSessionId !== undefined
          ? yield* getAgentSessionFilesForSession(projectPath, actualSessionId).pipe(
              Effect.provide(Layer.succeed(FileSystem.FileSystem, fs)),
              Effect.provide(Layer.succeed(Path.Path, path)),
              Effect.catchAll(() => Effect.succeed([] as string[])),
            )
          : [];

      // Read agent file contents
      const agentContents: string[] = [];
      for (const agentPath of agentFilePaths) {
        const agentContent = yield* fs
          .readFileString(agentPath)
          .pipe(Effect.catchAll(() => Effect.succeed("")));
        if (agentContent !== "") {
          agentContents.push(agentContent);
        }
      }

      // Aggregate token usage and cost
      const { totalCost, modelName } = aggregateTokenUsageAndCost([content, ...agentContents]);

      const messageCount = content.split("\n").filter((line) => line.trim() !== "").length;

      const now = Date.now();

      // Get project directory mtime for updating project row
      const projectStat = yield* fs
        .stat(projectPath)
        .pipe(Effect.catchAll(() => Effect.succeed(null)));
      const projectDirMtimeMs = projectStat
        ? Option.getOrElse(projectStat.mtime, () => new Date(0)).getTime()
        : 0;

      // Build searchable texts for FTS
      const ftsEntries: Array<{
        role: string;
        content: string;
        index: number;
      }> = [];
      for (let i = 0; i < conversations.length; i++) {
        const conversation = conversations[i];
        if (conversation === undefined) continue;
        const text = extractSearchableText(conversation);
        if (text !== null && text.trim() !== "") {
          ftsEntries.push({
            role: conversation.type,
            content: text,
            index: i,
          });
        }
      }

      // Upsert within a transaction
      db.transaction((tx) => {
        // Upsert session row
        tx.insert(sessions)
          .values({
            id: sessionId,
            projectId,
            filePath,
            messageCount,
            firstUserMessageJson:
              firstUserMessage !== null ? JSON.stringify(firstUserMessage) : null,
            customTitle,
            totalCostUsd: totalCost.totalUsd,
            costBreakdownJson: JSON.stringify(totalCost.breakdown),
            tokenUsageJson: JSON.stringify(totalCost.tokenUsage),
            modelName,
            prLinksJson: prLinks.length > 0 ? JSON.stringify(prLinks) : null,
            fileMtimeMs,
            lastModifiedAt: new Date(fileMtimeMs).toISOString(),
            syncedAt: now,
          })
          .onConflictDoUpdate({
            target: sessions.id,
            set: {
              projectId,
              filePath,
              messageCount,
              firstUserMessageJson:
                firstUserMessage !== null ? JSON.stringify(firstUserMessage) : null,
              customTitle,
              totalCostUsd: totalCost.totalUsd,
              costBreakdownJson: JSON.stringify(totalCost.breakdown),
              tokenUsageJson: JSON.stringify(totalCost.tokenUsage),
              modelName,
              prLinksJson: prLinks.length > 0 ? JSON.stringify(prLinks) : null,
              fileMtimeMs,
              lastModifiedAt: new Date(fileMtimeMs).toISOString(),
              syncedAt: now,
            },
          })
          .run();

        // Delete old FTS entries for this session
        rawDb.prepare("DELETE FROM session_messages_fts WHERE session_id = ?").run(sessionId);

        // Insert new FTS entries
        for (const entry of ftsEntries) {
          rawDb
            .prepare(
              `INSERT INTO session_messages_fts (session_id, project_id, role, content, conversation_index)
             VALUES (?, ?, ?, ?, ?)`,
            )
            .run(sessionId, projectId, entry.role, entry.content, entry.index);
        }

        // Update project dir_mtime_ms
        tx.update(projects)
          .set({ dirMtimeMs: projectDirMtimeMs, syncedAt: now })
          .where(eq(projects.id, projectId))
          .run();
      });
    });

  // -------------------------------------------------------------------------
  // Internal helper: update project session_count
  // -------------------------------------------------------------------------

  const updateProjectSessionCount = (projectId: string): void => {
    const result = db
      .select({ cnt: count() })
      .from(sessions)
      .where(eq(sessions.projectId, projectId))
      .get();
    const cnt = result?.cnt ?? 0;
    db.update(projects).set({ sessionCount: cnt }).where(eq(projects.id, projectId)).run();
  };

  // -------------------------------------------------------------------------
  // fullSync
  // -------------------------------------------------------------------------

  const fullSync = (): Effect.Effect<void, Error> =>
    Effect.gen(function* () {
      const { claudeProjectsDirPath } = yield* appContext.claudeCodePaths;

      // Skip if projects directory doesn't exist
      const dirExists = yield* fs
        .exists(claudeProjectsDirPath)
        .pipe(Effect.catchAll(() => Effect.succeed(false)));
      if (!dirExists) {
        return;
      }

      // List project directories
      const projectDirs = yield* fs
        .readDirectory(claudeProjectsDirPath)
        .pipe(Effect.catchAll(() => Effect.succeed([] as string[])));

      // Get known projects from DB
      const knownProjects = db.select().from(projects).all();
      const knownProjectIds = new Set(knownProjects.map((p) => p.id));
      const seenProjectIds = new Set<string>();

      for (const dirName of projectDirs) {
        const projectPath = path.join(claudeProjectsDirPath, dirName);

        // Check if this is a directory
        const dirStat = yield* fs
          .stat(projectPath)
          .pipe(Effect.catchAll(() => Effect.succeed(null)));
        if (!dirStat || dirStat.type !== "Directory") {
          continue;
        }

        const projectId = encodeProjectId(projectPath);
        seenProjectIds.add(projectId);

        const dirMtimeMs = Option.getOrElse(dirStat.mtime, () => new Date(0)).getTime();

        // Get current session file list from filesystem
        const fileNames = yield* fs
          .readDirectory(projectPath)
          .pipe(Effect.catchAll(() => Effect.succeed([] as string[])));
        const sessionFiles = fileNames.filter(isRegularSessionFile);

        // Ensure project row exists
        const existingProject = knownProjects.find((p) => p.id === projectId);
        if (!existingProject) {
          // Extract actual project cwd from the earliest session file
          const projectCwd = yield* extractProjectCwd(projectPath, sessionFiles);

          db.insert(projects)
            .values({
              id: projectId,
              name: projectCwd !== null ? path.basename(projectCwd) : null,
              path: projectCwd,
              sessionCount: 0,
              dirMtimeMs,
              syncedAt: Date.now(),
            })
            .onConflictDoNothing()
            .run();
        }

        // Get known sessions for this project from DB
        const knownSessions = db
          .select()
          .from(sessions)
          .where(eq(sessions.projectId, projectId))
          .all();
        const knownSessionPaths = new Set(knownSessions.map((s) => s.filePath));
        const seenFilePaths = new Set<string>();

        for (const fileName of sessionFiles) {
          const filePath = path.join(projectPath, fileName);
          seenFilePaths.add(filePath);

          const fileStat = yield* fs
            .stat(filePath)
            .pipe(Effect.catchAll(() => Effect.succeed(null)));
          if (!fileStat) continue;

          const fileMtimeMs = Option.getOrElse(fileStat.mtime, () => new Date(0)).getTime();

          // Check if new file or mtime changed
          const knownSession = knownSessions.find((s) => s.filePath === filePath);
          const isNew = !knownSessionPaths.has(filePath);
          const isModified = knownSession !== undefined && fileMtimeMs > knownSession.fileMtimeMs;

          if (isNew || isModified) {
            const sessionId = encodeSessionId(filePath);
            yield* parseAndUpsertSession(projectId, sessionId, filePath, fileMtimeMs).pipe(
              Effect.catchAll((e) => {
                console.error(`[SyncService] Failed to upsert session ${filePath}:`, e);
                return Effect.void;
              }),
            );
          }
        }

        // Delete sessions whose files no longer exist
        for (const knownSession of knownSessions) {
          if (!seenFilePaths.has(knownSession.filePath)) {
            db.delete(sessions).where(eq(sessions.filePath, knownSession.filePath)).run();
            rawDb
              .prepare("DELETE FROM session_messages_fts WHERE session_id = ?")
              .run(knownSession.id);
          }
        }

        updateProjectSessionCount(projectId);

        // Update project dir_mtime_ms and synced_at
        db.update(projects)
          .set({ dirMtimeMs, syncedAt: Date.now() })
          .where(eq(projects.id, projectId))
          .run();
      }

      // Delete projects that no longer exist on filesystem
      for (const knownProjectId of knownProjectIds) {
        if (!seenProjectIds.has(knownProjectId)) {
          db.delete(sessions).where(eq(sessions.projectId, knownProjectId)).run();
          rawDb
            .prepare("DELETE FROM session_messages_fts WHERE project_id = ?")
            .run(knownProjectId);
          db.delete(projects).where(eq(projects.id, knownProjectId)).run();
        }
      }
    });

  // -------------------------------------------------------------------------
  // syncSession
  // -------------------------------------------------------------------------

  const syncSession = (projectId: string, sessionId: string): Effect.Effect<void, Error> =>
    Effect.gen(function* () {
      const filePath = decodeSessionId(projectId, sessionId);

      const fileStat = yield* fs.stat(filePath).pipe(Effect.catchAll(() => Effect.succeed(null)));
      if (!fileStat) {
        // File no longer exists — remove from DB
        db.delete(sessions).where(eq(sessions.id, sessionId)).run();
        rawDb.prepare("DELETE FROM session_messages_fts WHERE session_id = ?").run(sessionId);
        updateProjectSessionCount(projectId);
        return;
      }

      const fileMtimeMs = Option.getOrElse(fileStat.mtime, () => new Date(0)).getTime();

      // Check stored mtime
      const stored = db
        .select({ fileMtimeMs: sessions.fileMtimeMs })
        .from(sessions)
        .where(eq(sessions.id, sessionId))
        .get();

      if (stored !== undefined && fileMtimeMs <= stored.fileMtimeMs) {
        // No changes
        return;
      }

      yield* parseAndUpsertSession(projectId, sessionId, filePath, fileMtimeMs);
      updateProjectSessionCount(projectId);
    });

  // -------------------------------------------------------------------------
  // syncProjectList
  // -------------------------------------------------------------------------

  const syncProjectList = (projectId: string): Effect.Effect<void, Error> =>
    Effect.gen(function* () {
      const projectPath = decodeProjectId(projectId);

      const dirExists = yield* fs
        .exists(projectPath)
        .pipe(Effect.catchAll(() => Effect.succeed(false)));
      if (!dirExists) {
        return;
      }

      const fileNames = yield* fs
        .readDirectory(projectPath)
        .pipe(Effect.catchAll(() => Effect.succeed([] as string[])));
      const sessionFiles = fileNames.filter(isRegularSessionFile);

      const knownSessions = db
        .select()
        .from(sessions)
        .where(eq(sessions.projectId, projectId))
        .all();
      const knownSessionPaths = new Set(knownSessions.map((s) => s.filePath));
      const seenFilePaths = new Set<string>();

      for (const fileName of sessionFiles) {
        const filePath = path.join(projectPath, fileName);
        seenFilePaths.add(filePath);

        if (!knownSessionPaths.has(filePath)) {
          // New file
          const fileStat = yield* fs
            .stat(filePath)
            .pipe(Effect.catchAll(() => Effect.succeed(null)));
          if (!fileStat) continue;

          const fileMtimeMs = Option.getOrElse(fileStat.mtime, () => new Date(0)).getTime();
          const sessionId = encodeSessionId(filePath);

          yield* parseAndUpsertSession(projectId, sessionId, filePath, fileMtimeMs).pipe(
            Effect.catchAll((e) => {
              console.error(`[SyncService] Failed to upsert session ${filePath}:`, e);
              return Effect.void;
            }),
          );
        }
      }

      // Delete sessions whose files no longer exist
      for (const knownSession of knownSessions) {
        if (!seenFilePaths.has(knownSession.filePath)) {
          db.delete(sessions).where(eq(sessions.filePath, knownSession.filePath)).run();
          rawDb
            .prepare("DELETE FROM session_messages_fts WHERE session_id = ?")
            .run(knownSession.id);
        }
      }

      updateProjectSessionCount(projectId);
    });

  return {
    fullSync,
    syncSession,
    syncProjectList,
  } satisfies ISyncService;
});

// ---------------------------------------------------------------------------
// SyncService Tag
// ---------------------------------------------------------------------------

export class SyncService extends Context.Tag("SyncService")<SyncService, ISyncService>() {
  static readonly Live = Layer.effect(this, LayerImpl);
}
