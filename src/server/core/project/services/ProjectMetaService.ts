import { Path } from "@effect/platform";
import { eq } from "drizzle-orm";
import { Context, Effect, Layer } from "effect";
import { DrizzleService } from "../../../lib/db/DrizzleService.ts";
import { type ProjectRow, projects } from "../../../lib/db/schema.ts";
import type { InferEffect } from "../../../lib/effect/types.ts";
import { SyncService } from "../../sync/services/SyncService.ts";
import type { ProjectMeta } from "../../types.ts";

const rowToProjectMeta = (row: ProjectRow, baseName: string): ProjectMeta => {
  const projectPath = row.path;
  const projectName = projectPath !== null ? baseName : null;

  return {
    projectName,
    projectPath,
    sessionCount: row.sessionCount,
  };
};

const LayerImpl = Effect.gen(function* () {
  const { db } = yield* DrizzleService;
  const syncService = yield* SyncService;
  const path = yield* Path.Path;

  const getProjectMeta = (projectId: string): Effect.Effect<ProjectMeta, Error> =>
    Effect.gen(function* () {
      const row = db.select().from(projects).where(eq(projects.id, projectId)).get();

      if (row === undefined) {
        // Not in DB yet — sync and retry
        yield* syncService.syncProjectList(projectId).pipe(Effect.catchAll(() => Effect.void));

        const retryRow = db.select().from(projects).where(eq(projects.id, projectId)).get();

        if (retryRow === undefined) {
          return yield* Effect.fail(new Error(`Project not found: ${projectId}`));
        }

        const baseName = retryRow.path !== null ? path.basename(retryRow.path) : "";
        return rowToProjectMeta(retryRow, baseName);
      }

      const baseName = row.path !== null ? path.basename(row.path) : "";
      return rowToProjectMeta(row, baseName);
    });

  const invalidateProject = (projectId: string): Effect.Effect<void> =>
    syncService.syncProjectList(projectId).pipe(Effect.catchAll(() => Effect.void));

  return {
    getProjectMeta,
    invalidateProject,
  };
});

export type IProjectMetaService = InferEffect<typeof LayerImpl>;

export class ProjectMetaService extends Context.Tag("ProjectMetaService")<
  ProjectMetaService,
  IProjectMetaService
>() {
  static Live = Layer.effect(this, LayerImpl);
}
