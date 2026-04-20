/* oxlint-disable no-restricted-imports */
/* Exception: this test-only layer intentionally uses Node built-ins because migrating all DB tests to the new runtime abstraction at once is high-cost. Keep this exception scoped to this file only. */
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-sqlite";
import { migrate } from "drizzle-orm/node-sqlite/migrator";
import { Layer } from "effect";
import { type DrizzleDb, DrizzleService } from "../../server/lib/db/DrizzleService";
import * as schema from "../../server/lib/db/schema";

const migrationsFolder = fileURLToPath(new URL("../../server/lib/db/migrations", import.meta.url));

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

export const createInMemoryDrizzle = () => {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON");
  const db = drizzle({ client: sqlite, schema });
  migrate(db, { migrationsFolder });
  sqlite.exec(FTS5_DDL);

  return { db, rawDb: sqlite };
};

export const makeDrizzleTestServiceLayer = (seed?: (db: DrizzleDb) => void) => {
  const { db, rawDb } = createInMemoryDrizzle();
  seed?.(db);
  return Layer.succeed(DrizzleService, { db, rawDb });
};
