import { Context, Data, Effect, Layer } from "effect";
import type { InferEffect } from "../../../lib/effect/types";
import { ProjectRepository } from "../../project/infrastructure/ProjectRepository";
import { parseMcpListOutput } from "../functions/parseMcpListOutput";
import * as ClaudeCode from "../models/ClaudeCode";

class ProjectPathNotFoundError extends Data.TaggedError(
  "ProjectPathNotFoundError",
)<{
  projectId: string;
}> {}

const LayerImpl = Effect.gen(function* () {
  const projectRepository = yield* ProjectRepository;

  const getMcpList = (projectId: string) =>
    Effect.gen(function* () {
      const { project } = yield* projectRepository.getProject(projectId);
      if (project.meta.projectPath === null) {
        return yield* Effect.fail(new ProjectPathNotFoundError({ projectId }));
      }

      const output = yield* ClaudeCode.getMcpListOutput(
        project.meta.projectPath,
      );
      return parseMcpListOutput(output);
    });

  return {
    getMcpList,
  };
});

export type IClaudeCodeService = InferEffect<typeof LayerImpl>;

export class ClaudeCodeService extends Context.Tag("ClaudeCodeService")<
  ClaudeCodeService,
  IClaudeCodeService
>() {
  static Live = Layer.effect(this, LayerImpl);
}
