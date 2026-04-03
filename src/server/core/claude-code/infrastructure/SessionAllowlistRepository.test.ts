import { it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { expect } from "vitest";
import {
  createInMemoryDrizzle,
  makeDrizzleTestServiceLayer,
} from "../../../../testing/layers/testDrizzleServiceLayer.ts";
import { DrizzleService } from "../../../lib/db/DrizzleService.ts";
import { projects, sessions } from "../../../lib/db/schema.ts";
import { SessionAllowlistRepository } from "./SessionAllowlistRepository.ts";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const defaultProjectRow: typeof projects.$inferInsert = {
  id: "test-project-id",
  name: "test-project",
  path: "/test/project",
  sessionCount: 0,
  dirMtimeMs: Date.now(),
  syncedAt: Date.now(),
};

const makeSessionRow = (
  overrides?: Partial<typeof sessions.$inferInsert>,
): typeof sessions.$inferInsert => ({
  id: "test-session-id",
  projectId: "test-project-id",
  filePath: "/test/project/test-session-id.jsonl",
  messageCount: 0,
  firstUserMessageJson: null,
  customTitle: null,
  totalCostUsd: 0,
  costBreakdownJson: null,
  tokenUsageJson: null,
  modelName: null,
  prLinksJson: null,
  fileMtimeMs: Date.now(),
  lastModifiedAt: new Date().toISOString(),
  syncedAt: Date.now(),
  ...overrides,
});

const makeDrizzleServiceWithData = (opts: {
  projectRows?: (typeof projects.$inferInsert)[];
  sessionRows?: (typeof sessions.$inferInsert)[];
}): Layer.Layer<DrizzleService> =>
  makeDrizzleTestServiceLayer((db) => {
    for (const row of opts.projectRows ?? []) {
      db.insert(projects).values(row).run();
    }
    for (const row of opts.sessionRows ?? []) {
      db.insert(sessions).values(row).run();
    }
  });

const sessionId = "test-session-id";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SessionAllowlistRepository", () => {
  describe("getAllowlist", () => {
    it.live("returns empty array for non-existent session", () =>
      Effect.gen(function* () {
        const repo = yield* SessionAllowlistRepository;
        const result = yield* repo.getAllowlist("nonexistent-session");

        expect(result).toEqual([]);
      }).pipe(
        Effect.provide(SessionAllowlistRepository.Live),
        Effect.provide(makeDrizzleTestServiceLayer()),
      ),
    );

    it.live("returns empty array when column is null", () =>
      Effect.gen(function* () {
        const repo = yield* SessionAllowlistRepository;
        const result = yield* repo.getAllowlist(sessionId);

        expect(result).toEqual([]);
      }).pipe(
        Effect.provide(SessionAllowlistRepository.Live),
        Effect.provide(
          makeDrizzleServiceWithData({
            projectRows: [defaultProjectRow],
            sessionRows: [makeSessionRow({ permissionAllowlistJson: null })],
          }),
        ),
      ),
    );
  });

  describe("addRule", () => {
    it.live("adds a rule and getAllowlist returns it", () => {
      const { db, rawDb } = createInMemoryDrizzle();
      db.insert(projects).values(defaultProjectRow).run();
      db.insert(sessions).values(makeSessionRow()).run();

      return Effect.gen(function* () {
        const repo = yield* SessionAllowlistRepository;
        yield* repo.addRule(sessionId, "Bash(npm test:*)");
        const result = yield* repo.getAllowlist(sessionId);

        expect(result).toEqual(["Bash(npm test:*)"]);
      }).pipe(
        Effect.provide(SessionAllowlistRepository.Live),
        Effect.provide(Layer.succeed(DrizzleService, { db, rawDb })),
      );
    });

    it.live("does not add duplicate rules", () => {
      const { db, rawDb } = createInMemoryDrizzle();
      db.insert(projects).values(defaultProjectRow).run();
      db.insert(sessions)
        .values(
          makeSessionRow({
            permissionAllowlistJson: JSON.stringify(["Bash(npm test:*)"]),
          }),
        )
        .run();

      return Effect.gen(function* () {
        const repo = yield* SessionAllowlistRepository;
        yield* repo.addRule(sessionId, "Bash(npm test:*)");
        const result = yield* repo.getAllowlist(sessionId);

        expect(result).toEqual(["Bash(npm test:*)"]);
      }).pipe(
        Effect.provide(SessionAllowlistRepository.Live),
        Effect.provide(Layer.succeed(DrizzleService, { db, rawDb })),
      );
    });

    it.live("appends to existing rules", () => {
      const { db, rawDb } = createInMemoryDrizzle();
      db.insert(projects).values(defaultProjectRow).run();
      db.insert(sessions)
        .values(
          makeSessionRow({
            permissionAllowlistJson: JSON.stringify(["Bash(npm test:*)"]),
          }),
        )
        .run();

      return Effect.gen(function* () {
        const repo = yield* SessionAllowlistRepository;
        yield* repo.addRule(sessionId, "Read(*)");
        const result = yield* repo.getAllowlist(sessionId);

        expect(result).toEqual(["Bash(npm test:*)", "Read(*)"]);
      }).pipe(
        Effect.provide(SessionAllowlistRepository.Live),
        Effect.provide(Layer.succeed(DrizzleService, { db, rawDb })),
      );
    });
  });
});
