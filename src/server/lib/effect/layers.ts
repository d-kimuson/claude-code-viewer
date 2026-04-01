import { NodeContext } from "@effect/platform-node";
import { Layer } from "effect";
import { EventBus } from "../../core/events/services/EventBus.ts";
import { ApplicationContext } from "../../core/platform/services/ApplicationContext.ts";
import { CcvOptionsService } from "../../core/platform/services/CcvOptionsService.ts";
import { EnvService } from "../../core/platform/services/EnvService.ts";
import { UserConfigService } from "../../core/platform/services/UserConfigService.ts";

export const platformLayer = Layer.mergeAll(
  ApplicationContext.Live,
  UserConfigService.Live,
  EventBus.Live,
  EnvService.Live,
  CcvOptionsService.Live,
).pipe(
  Layer.provide(EnvService.Live),
  Layer.provide(CcvOptionsService.Live),
  Layer.provide(NodeContext.layer),
);
