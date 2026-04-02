/* oxlint-disable no-restricted-imports */
/* Exception: node:sqlite is required by drizzle node-sqlite driver. */
import { DatabaseSync } from "node:sqlite";
import { FileSystem, Path } from "@effect/platform";
import { drizzle, type NodeSQLiteDatabase } from "drizzle-orm/node-sqlite";
import { migrate } from "drizzle-orm/node-sqlite/migrator";
import { Context, Effect, Layer } from "effect";
import { ApplicationContext } from "../../core/platform/services/ApplicationContext.ts";
import * as schema from "./schema.ts";

const migrationsFolder = new URL("./migrations", import.meta.url).pathname;
const FTS5_DDL = `
  CREATE VIRTUAL TABLE IF NOT EXISTS session_messages_fts USING fts5(
    session_id UNINDEXED,
    project_id UNINDEXED,
    role UNINDEXED,
    content,
    conversation_index UNINDEXED,
    tokenize='trigram'
  )
`;

const initDbAtPath = (cacheDbPath: string): { db: DrizzleDb; rawDb: DatabaseSync } => {
  const sqlite = new DatabaseSync(cacheDbPath);
  sqlite.exec("PRAGMA journal_mode = WAL");
  sqlite.exec("PRAGMA foreign_keys = ON");

  const db = drizzle({ client: sqlite, schema });
  migrate(db, { migrationsFolder });
  sqlite.exec(FTS5_DDL);

  return { db, rawDb: sqlite };
};

export type DrizzleDb = NodeSQLiteDatabase<typeof schema>;

export class DrizzleService extends Context.Tag("DrizzleService")<
  DrizzleService,
  { readonly db: DrizzleDb; readonly rawDb: DatabaseSync }
>() {
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const context = yield* ApplicationContext;
      const claudeCodePaths = yield* context.claudeCodePaths;

      const homeDirectory = path.dirname(claudeCodePaths.globalClaudeDirectoryPath);
      const dbDirPath = path.resolve(homeDirectory, ".claude-code-viewer");
      const dbPath = path.resolve(dbDirPath, "cache.db");

      yield* fs.makeDirectory(dbDirPath, { recursive: true });

      const dbResult = yield* Effect.either(
        Effect.try({
          try: () => initDbAtPath(dbPath),
          catch: (error) => error,
        }),
      );

      if (dbResult._tag === "Right") {
        return dbResult.right;
      }

      const error = dbResult.left;
      console.warn(
        "[DrizzleService] Migration failed, recreating cache DB:",
        error instanceof Error ? error.message : error,
      );

      try {
        new DatabaseSync(dbPath).close();
      } catch {
        // ignore
      }

      for (const suffix of ["", "-wal", "-shm"]) {
        yield* fs
          .remove(`${dbPath}${suffix}`, { force: true })
          .pipe(Effect.catchAll(() => Effect.void));
      }

      return initDbAtPath(dbPath);
    }),
  );
}
