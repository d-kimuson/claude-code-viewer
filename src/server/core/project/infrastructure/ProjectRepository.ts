import { FileSystem } from "@effect/platform";
import { desc } from "drizzle-orm";
import { Context, Effect, Layer, Option } from "effect";
import { DrizzleService } from "../../../lib/db/DrizzleService.ts";
import { projects } from "../../../lib/db/schema.ts";
import type { InferEffect } from "../../../lib/effect/types.ts";
import { ApplicationContext } from "../../platform/services/ApplicationContext.ts";
import type { Project } from "../../types.ts";
import { decodeProjectId, validateProjectPath } from "../functions/id.ts";
import { ProjectMetaService } from "../services/ProjectMetaService.ts";

const LayerImpl = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const projectMetaService = yield* ProjectMetaService;
  const context = yield* ApplicationContext;
  const { db } = yield* DrizzleService;

  const getProject = (projectId: string) =>
    Effect.gen(function* () {
      const fullPath = decodeProjectId(projectId);

      // Validate that the decoded path is within the Claude projects directory
      const { claudeProjectsDirPath } = yield* context.claudeCodePaths;
      if (!validateProjectPath(fullPath, claudeProjectsDirPath)) {
        return yield* Effect.fail(new Error("Invalid project path: outside allowed directory"));
      }

      // Check if project directory exists
      const exists = yield* fs.exists(fullPath);
      if (!exists) {
        return yield* Effect.fail(new Error("Project not found"));
      }

      // Get file stats
      const stat = yield* fs.stat(fullPath);

      // Get project metadata
      const meta = yield* projectMetaService.getProjectMeta(projectId);

      return {
        project: {
          id: projectId,
          claudeProjectPath: fullPath,
          lastModifiedAt: Option.getOrElse(stat.mtime, () => new Date()),
          meta,
        },
      };
    });

  const getProjects = () =>
    Effect.gen(function* () {
      // Fetch all projects from DB ordered by dirMtimeMs DESC
      const rows = db.select().from(projects).orderBy(desc(projects.dirMtimeMs)).all();

      if (rows.length === 0) {
        return { projects: [] };
      }

      const projectsList: Project[] = yield* Effect.all(
        rows.map((row) =>
          Effect.gen(function* () {
            const meta = yield* projectMetaService.getProjectMeta(row.id);
            return {
              id: row.id,
              claudeProjectPath: row.path ?? decodeProjectId(row.id),
              lastModifiedAt: new Date(row.dirMtimeMs),
              meta,
            } satisfies Project;
          }),
        ),
        { concurrency: "unbounded" },
      );

      return { projects: projectsList };
    });

  return {
    getProject,
    getProjects,
  };
});

export type IProjectRepository = InferEffect<typeof LayerImpl>;
export class ProjectRepository extends Context.Tag("ProjectRepository")<
  ProjectRepository,
  IProjectRepository
>() {
  static Live = Layer.effect(this, LayerImpl);
}
