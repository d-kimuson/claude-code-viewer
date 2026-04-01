import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

// ---------------------------------------------------------------------------
// projects
// ---------------------------------------------------------------------------

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  name: text("name"),
  path: text("path"),
  sessionCount: integer("session_count").notNull().default(0),
  dirMtimeMs: integer("dir_mtime_ms").notNull(),
  syncedAt: integer("synced_at").notNull(),
});

// ---------------------------------------------------------------------------
// sessions
// ---------------------------------------------------------------------------

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    filePath: text("file_path").notNull().unique(),
    messageCount: integer("message_count").notNull().default(0),
    firstUserMessageJson: text("first_user_message_json"),
    customTitle: text("custom_title"),
    totalCostUsd: real("total_cost_usd").notNull().default(0),
    costBreakdownJson: text("cost_breakdown_json"),
    tokenUsageJson: text("token_usage_json"),
    modelName: text("model_name"),
    prLinksJson: text("pr_links_json"),
    fileMtimeMs: integer("file_mtime_ms").notNull(),
    lastModifiedAt: text("last_modified_at").notNull(),
    syncedAt: integer("synced_at").notNull(),
  },
  (table) => [
    index("idx_sessions_project_id").on(table.projectId),
    index("idx_sessions_file_mtime").on(table.fileMtimeMs),
  ],
);

// ---------------------------------------------------------------------------
// sync_state
// ---------------------------------------------------------------------------

export const syncState = sqliteTable("sync_state", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

// ---------------------------------------------------------------------------
// Inferred row types (for use outside drizzle query builder)
// ---------------------------------------------------------------------------

export type ProjectRow = typeof projects.$inferSelect;
export type SessionRow = typeof sessions.$inferSelect;
export type SyncStateRow = typeof syncState.$inferSelect;
