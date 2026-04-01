import { sql } from "drizzle-orm";
import { Context, Effect, Layer } from "effect";
import { DrizzleService } from "../../../lib/db/DrizzleService.ts";
import type { InferEffect } from "../../../lib/effect/types.ts";

export type SearchResult = {
  projectId: string;
  projectName: string;
  sessionId: string;
  conversationIndex: number;
  type: "user" | "assistant";
  snippet: string;
  timestamp: string;
  score: number;
};

// FTS5 query result row type (raw SQL returns snake_case)
type SearchJoinRow = {
  session_id: string;
  project_id: string;
  project_name: string | null;
  role: string;
  content: string;
  conversation_index: number;
  rank: number;
  last_modified_at: string | null;
};

/**
 * Escape user input for FTS5 MATCH queries.
 * When using trigram tokenizer, queries are treated as plain strings,
 * but special characters like double quotes or parentheses can cause
 * parse errors. Wrap the entire input in double quotes and escape
 * internal double quotes.
 */
const escapeFtsQuery = (query: string): string => {
  const escaped = query.replace(/"/g, '""');
  return `"${escaped}"`;
};

const isValidRole = (role: string): role is "user" | "assistant" =>
  role === "user" || role === "assistant";

const LayerImpl = Effect.gen(function* () {
  const drizzleService = yield* DrizzleService;
  const { db } = drizzleService;

  const search = (query: string, limit = 20, projectId?: string) =>
    Effect.gen(function* () {
      if (!query.trim()) {
        return { results: [] as SearchResult[] };
      }

      const ftsQuery = escapeFtsQuery(query);

      let drizzleQuery = sql`
        SELECT
          fts.session_id,
          fts.project_id,
          p.name as project_name,
          fts.role,
          fts.content,
          CAST(fts.conversation_index AS INTEGER) as conversation_index,
          fts.rank,
          s.last_modified_at
        FROM session_messages_fts fts
        LEFT JOIN projects p ON p.id = fts.project_id
        LEFT JOIN sessions s ON s.id = fts.session_id
        WHERE session_messages_fts MATCH ${ftsQuery}
      `;

      if (projectId !== undefined) {
        drizzleQuery = sql`${drizzleQuery} AND fts.project_id = ${projectId}`;
      }

      // rank sorts by BM25 score (lower = more relevant)
      // Fetch extra rows to allow for role filtering
      drizzleQuery = sql`${drizzleQuery} ORDER BY rank LIMIT ${limit * 2}`;

      const rows = yield* Effect.try({
        try: () => db.all<SearchJoinRow>(drizzleQuery),
        catch: (err) =>
          new Error(`FTS5 query failed: ${err instanceof Error ? err.message : String(err)}`),
      });

      const results: SearchResult[] = [];
      for (const row of rows) {
        if (results.length >= limit) break;

        if (!isValidRole(row.role)) continue;

        const text = row.content;
        const queryLower = query.toLowerCase();
        const textLower = text.toLowerCase();
        const matchIndex = textLower.indexOf(queryLower);
        const snippetLength = 150;

        let snippet: string;
        if (matchIndex !== -1) {
          const start = Math.max(0, matchIndex - 50);
          const end = Math.min(text.length, start + snippetLength);
          snippet =
            (start > 0 ? "..." : "") + text.slice(start, end) + (end < text.length ? "..." : "");
        } else {
          snippet = text.slice(0, snippetLength) + (text.length > snippetLength ? "..." : "");
        }

        // FTS5 rank is negative (BM25): larger absolute value = more relevant
        // Boost user messages
        const score = row.role === "user" ? -row.rank * 1.2 : -row.rank;

        results.push({
          projectId: row.project_id,
          projectName: row.project_name ?? "",
          sessionId: row.session_id,
          conversationIndex: row.conversation_index,
          type: row.role,
          snippet,
          timestamp: row.last_modified_at ?? "",
          score,
        });
      }

      return { results };
    }).pipe(
      Effect.catchAll((err) => {
        console.error("SearchService.search error:", err);
        return Effect.succeed({ results: [] as SearchResult[] });
      }),
    );

  // FTS5 always reads latest data, so invalidation is a no-op
  const invalidateIndex = () => Effect.void;

  return {
    search,
    invalidateIndex,
  };
});

export type ISearchService = InferEffect<typeof LayerImpl>;
export class SearchService extends Context.Tag("SearchService")<SearchService, ISearchService>() {
  static Live = Layer.effect(this, LayerImpl);
}
