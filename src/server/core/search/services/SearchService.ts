import { FileSystem, Path } from "@effect/platform";
import { Context, Effect, Layer, Ref } from "effect";
import MiniSearch from "minisearch";
import type { InferEffect } from "../../../lib/effect/types";
import { parseJsonl } from "../../claude-code/functions/parseJsonl";
import { ApplicationContext } from "../../platform/services/ApplicationContext";
import { encodeProjectId } from "../../project/functions/id";
import { encodeSessionId } from "../../session/functions/id";
import { isRegularSessionFile } from "../../session/functions/isRegularSessionFile";
import { extractSearchableText } from "../functions/extractSearchableText";

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

type SearchDocument = {
  id: string;
  projectId: string;
  projectName: string;
  sessionId: string;
  conversationIndex: number;
  type: "user" | "assistant";
  text: string;
  timestamp: string;
};

type IndexCache = {
  index: MiniSearch<SearchDocument>;
  documents: Map<string, SearchDocument>;
  builtAt: number;
};

const INDEX_TTL_MS = 60_000; // Cache index for 1 minute
const MAX_TEXT_LENGTH = 2000; // Limit indexed text to reduce memory
const MAX_ASSISTANT_TEXT_LENGTH = 500; // Assistant responses less important

const createMiniSearchIndex = () =>
  new MiniSearch<SearchDocument>({
    fields: ["text"],
    storeFields: ["id"],
    searchOptions: {
      fuzzy: 0.2,
      prefix: true,
      boost: { text: 1 },
    },
  });

const LayerImpl = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const context = yield* ApplicationContext;
  const indexCacheRef = yield* Ref.make<IndexCache | null>(null);

  const buildIndex = () =>
    Effect.gen(function* () {
      const { claudeProjectsDirPath } = yield* context.claudeCodePaths;

      const dirExists = yield* fs.exists(claudeProjectsDirPath);
      if (!dirExists) {
        return { index: createMiniSearchIndex(), documents: new Map() };
      }

      const projectEntries = yield* fs.readDirectory(claudeProjectsDirPath);
      const miniSearch = createMiniSearchIndex();

      const documentEffects = projectEntries.map((projectEntry) =>
        Effect.gen(function* () {
          const projectPath = path.resolve(claudeProjectsDirPath, projectEntry);
          const stat = yield* fs
            .stat(projectPath)
            .pipe(Effect.catchAll(() => Effect.succeed(null)));

          if (stat?.type !== "Directory") {
            return [];
          }

          const projectId = encodeProjectId(projectPath);
          const projectName = path.basename(projectPath);

          const sessionEntries = yield* fs
            .readDirectory(projectPath)
            .pipe(Effect.catchAll(() => Effect.succeed([])));

          const sessionFiles = sessionEntries.filter(isRegularSessionFile);

          const sessionDocuments = yield* Effect.all(
            sessionFiles.map((sessionFile) =>
              Effect.gen(function* () {
                const sessionPath = path.resolve(projectPath, sessionFile);
                const sessionId = encodeSessionId(sessionPath);

                const content = yield* fs
                  .readFileString(sessionPath)
                  .pipe(Effect.catchAll(() => Effect.succeed("")));

                if (!content) return [];

                const conversations = parseJsonl(content);
                const documents: SearchDocument[] = [];

                for (let i = 0; i < conversations.length; i++) {
                  const conversation = conversations[i];
                  if (conversation === undefined) continue;
                  if (
                    conversation.type !== "user" &&
                    conversation.type !== "assistant"
                  ) {
                    continue;
                  }

                  let text = extractSearchableText(conversation);
                  if (!text || text.length < 3) continue;

                  // Truncate text to reduce memory usage
                  // User prompts get more space as they're more relevant
                  const maxLen =
                    conversation.type === "user"
                      ? MAX_TEXT_LENGTH
                      : MAX_ASSISTANT_TEXT_LENGTH;
                  if (text.length > maxLen) {
                    text = text.slice(0, maxLen);
                  }

                  documents.push({
                    id: `${sessionId}:${i}`,
                    projectId,
                    projectName,
                    sessionId,
                    conversationIndex: i,
                    type: conversation.type,
                    text,
                    timestamp:
                      "timestamp" in conversation ? conversation.timestamp : "",
                  });
                }

                return documents;
              }),
            ),
            { concurrency: 20 },
          );

          return sessionDocuments.flat();
        }),
      );

      const allDocuments = yield* Effect.all(documentEffects, {
        concurrency: 10,
      });
      const flatDocuments = allDocuments.flat();

      miniSearch.addAll(flatDocuments);

      const documentsMap = new Map<string, SearchDocument>();
      for (const doc of flatDocuments) {
        documentsMap.set(doc.id, doc);
      }

      return { index: miniSearch, documents: documentsMap };
    });

  const getIndex = () =>
    Effect.gen(function* () {
      const cached = yield* Ref.get(indexCacheRef);
      const now = Date.now();

      if (cached && now - cached.builtAt < INDEX_TTL_MS) {
        return { index: cached.index, documents: cached.documents };
      }

      const { index, documents } = yield* buildIndex();
      yield* Ref.set(indexCacheRef, { index, documents, builtAt: now });
      return { index, documents };
    });

  const search = (query: string, limit = 20, projectId?: string) =>
    Effect.gen(function* () {
      const { claudeProjectsDirPath } = yield* context.claudeCodePaths;

      const dirExists = yield* fs.exists(claudeProjectsDirPath);
      if (!dirExists) {
        return { results: [] as SearchResult[] };
      }

      const { index: miniSearch, documents } = yield* getIndex();

      const searchResults = miniSearch.search(query).slice(0, limit * 2); // fetch extra to account for filtering

      const results: SearchResult[] = [];
      for (const result of searchResults) {
        if (results.length >= limit) break;

        const doc = documents.get(String(result.id));
        if (!doc) continue;

        // Filter by projectId if provided
        if (projectId && doc.projectId !== projectId) continue;

        // Minor boost for user messages (your prompts)
        const score = doc.type === "user" ? result.score * 1.2 : result.score;

        const snippetLength = 150;
        const text = doc.text;
        const queryLower = query.toLowerCase();
        const textLower = text.toLowerCase();
        const matchIndex = textLower.indexOf(queryLower);

        let snippet: string;
        if (matchIndex !== -1) {
          const start = Math.max(0, matchIndex - 50);
          const end = Math.min(text.length, start + snippetLength);
          snippet =
            (start > 0 ? "..." : "") +
            text.slice(start, end) +
            (end < text.length ? "..." : "");
        } else {
          snippet =
            text.slice(0, snippetLength) +
            (text.length > snippetLength ? "..." : "");
        }

        results.push({
          projectId: doc.projectId,
          projectName: doc.projectName,
          sessionId: doc.sessionId,
          conversationIndex: doc.conversationIndex,
          type: doc.type,
          snippet,
          timestamp: doc.timestamp,
          score,
        });
      }

      return { results };
    });

  const invalidateIndex = () => Ref.set(indexCacheRef, null);

  return {
    search,
    invalidateIndex,
  };
});

export type ISearchService = InferEffect<typeof LayerImpl>;
export class SearchService extends Context.Tag("SearchService")<
  SearchService,
  ISearchService
>() {
  static Live = Layer.effect(this, LayerImpl);
}
