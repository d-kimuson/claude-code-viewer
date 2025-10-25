import { Effect, Layer } from "effect";
import { ProjectMetaService } from "../../core/project/services/ProjectMetaService";
import type { ProjectMeta } from "../../core/types";

export const testProjectMetaServiceLayer = (options?: {
  meta?: ProjectMeta;
  invalidateProject?: () => Effect.Effect<void>;
}) => {
  const {
    meta = {
      projectName: null,
      projectPath: null,
      sessionCount: 0,
    },
    invalidateProject = () => Effect.void,
  } = options ?? {};

  return Layer.mock(ProjectMetaService, {
    getProjectMeta: () => Effect.succeed(meta),
    invalidateProject: invalidateProject,
  });
};
