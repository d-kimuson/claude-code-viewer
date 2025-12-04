import { Context, Effect, Layer } from "effect";
import type { ControllerResponse } from "../../../lib/effect/toEffectResponse";
import type { InferEffect } from "../../../lib/effect/types";
import { SearchService } from "../services/SearchService";

const LayerImpl = Effect.gen(function* () {
  const searchService = yield* SearchService;

  const search = (options: {
    query: string;
    limit?: number;
    projectId?: string;
  }) =>
    Effect.gen(function* () {
      const { query, limit, projectId } = options;

      if (!query || query.trim().length < 2) {
        return {
          status: 400,
          response: { error: "Query must be at least 2 characters" },
        } as const satisfies ControllerResponse;
      }

      const { results } = yield* searchService.search(
        query.trim(),
        limit,
        projectId,
      );

      return {
        status: 200,
        response: { results },
      } as const satisfies ControllerResponse;
    });

  return {
    search,
  };
});

export type ISearchController = InferEffect<typeof LayerImpl>;
export class SearchController extends Context.Tag("SearchController")<
  SearchController,
  ISearchController
>() {
  static Live = Layer.effect(this, LayerImpl);
}
