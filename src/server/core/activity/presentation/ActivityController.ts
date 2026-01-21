import { Context, Effect, Layer } from "effect";
import type { ControllerResponse } from "../../../lib/effect/toEffectResponse";
import type { InferEffect } from "../../../lib/effect/types";
import { ActivityContextService } from "../services/ActivityContextService";
import { ActivityFeedService } from "../services/ActivityFeedService";

const LayerImpl = Effect.gen(function* () {
  const activityFeedService = yield* ActivityFeedService;
  const activityContextService = yield* ActivityContextService;

  const getRecentActivity = (limit = 100) =>
    Effect.gen(function* () {
      const entries = yield* activityFeedService.getRecentEntries(limit);

      // Map to public format (exclude rawEntry)
      const publicEntries = entries.map((entry) => ({
        id: entry.id,
        projectId: entry.projectId,
        sessionId: entry.sessionId,
        entryType: entry.entryType,
        preview: entry.preview,
        timestamp: entry.timestamp,
      }));

      return {
        status: 200,
        response: { entries: publicEntries },
      } as const satisfies ControllerResponse;
    });

  const getEntryContext = (options: {
    projectId: string;
    sessionId: string;
    timestamp: string;
    before?: number;
    after?: number;
  }) =>
    Effect.gen(function* () {
      const context = yield* activityContextService.getEntryContext(options);

      return {
        status: 200,
        response: context,
      } as const satisfies ControllerResponse;
    });

  return {
    getRecentActivity,
    getEntryContext,
  };
});

export type IActivityController = InferEffect<typeof LayerImpl>;

export class ActivityController extends Context.Tag("ActivityController")<
  ActivityController,
  IActivityController
>() {
  static Live = Layer.effect(this, LayerImpl);
}
