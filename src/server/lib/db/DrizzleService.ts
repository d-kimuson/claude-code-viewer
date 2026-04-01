import { mkdirSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { drizzle, type NodeSQLiteDatabase } from "drizzle-orm/node-sqlite";
import { migrate } from "drizzle-orm/node-sqlite/migrator";
import { Context, Effect, Layer } from "effect";
import * as schema from "./schema";

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const dbDirPath = resolve(homedir(), ".claude-code-viewer");
export const dbPath = resolve(dbDirPath, "cache.db");
const migrationsFolder = new URL("./migrations", import.meta.url).pathname;

// ---------------------------------------------------------------------------
// Internal: initialize SQLite + drizzle + FTS5
// ---------------------------------------------------------------------------

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

const initDb = (): { db: DrizzleDb; rawDb: DatabaseSync } => {
  const sqlite = new DatabaseSync(dbPath);
  sqlite.exec("PRAGMA journal_mode = WAL");
  sqlite.exec("PRAGMA foreign_keys = ON");

  const db = drizzle({ client: sqlite, schema });

  migrate(db, { migrationsFolder });

  sqlite.exec(FTS5_DDL);

  return { db, rawDb: sqlite };
};

// ---------------------------------------------------------------------------
// DrizzleService
// ---------------------------------------------------------------------------

export type DrizzleDb = NodeSQLiteDatabase<typeof schema>;

export class DrizzleService extends Context.Tag("DrizzleService")<
  DrizzleService,
  { readonly db: DrizzleDb; readonly rawDb: DatabaseSync }
>() {
  static readonly Live = Layer.effect(
    this,
    Effect.sync(() => {
      mkdirSync(dbDirPath, { recursive: true });

      try {
        return initDb();
      } catch (err) {
        // Migration failure on an existing cache DB (e.g. format upgrade).
        // The DB is purely a cache, so we can safely delete and recreate it.
        console.warn(
          "[DrizzleService] Migration failed, recreating cache DB:",
          err instanceof Error ? err.message : err,
        );

        // Close any open handle, then remove all SQLite files
        try {
          new DatabaseSync(dbPath).close();
        } catch {
          // ignore
        }
        for (const suffix of ["", "-wal", "-shm"]) {
          rmSync(`${dbPath}${suffix}`, { force: true });
        }

        return initDb();
      }
    }),
  );
}
