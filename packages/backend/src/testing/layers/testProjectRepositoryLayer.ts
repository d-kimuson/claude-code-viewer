import { Effect, Layer } from "effect";
import { ProjectRepository } from "../../core/project/infrastructure/ProjectRepository";

export const testProjectRepositoryLayer = (options?: {
  projects?: Array<{
    id: string;
    claudeProjectPath: string;
    lastModifiedAt: Date;
    meta: {
      projectName: string | null;
      projectPath: string | null;
      sessionCount: number;
    };
  }>;
}) => {
  const { projects = [] } = options ?? {};

  return Layer.mock(ProjectRepository, {
    getProjects: () => Effect.succeed({ projects }),
    getProject: (projectId) =>
      Effect.sync(() => {
        const project = projects.find((p) => p.id === projectId);
        if (!project) {
          throw new Error("Project not found");
        }
        return {
          project: project,
        };
      }),
  });
};
