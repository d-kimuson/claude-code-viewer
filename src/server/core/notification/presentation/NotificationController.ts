import { Context, Effect, Layer } from "effect";
import type { SessionNotificationType } from "../../../../types/notification.ts";
import type { ControllerResponse } from "../../../lib/effect/toEffectResponse.ts";
import type { InferEffect } from "../../../lib/effect/types.ts";
import { NotificationService } from "../services/NotificationService.ts";

const LayerImpl = Effect.gen(function* () {
  const notificationService = yield* NotificationService;

  const getNotifications = () =>
    Effect.gen(function* () {
      const notifications = yield* notificationService.getNotifications();

      return {
        response: { notifications },
        status: 200,
      } as const satisfies ControllerResponse;
    });

  const consumeNotifications = (params: { sessionId: string; types?: SessionNotificationType[] }) =>
    Effect.gen(function* () {
      yield* notificationService.consumeNotifications(params.sessionId, {
        types: params.types,
      });

      return {
        response: { success: true },
        status: 200,
      } as const satisfies ControllerResponse;
    });

  const getVapidPublicKey = () =>
    Effect.gen(function* () {
      const publicKey = yield* notificationService.getVapidPublicKey();

      return {
        response: { publicKey },
        status: 200,
      } as const satisfies ControllerResponse;
    });

  const subscribePush = (params: {
    subscription: {
      endpoint: string;
      keys: { p256dh: string; auth: string };
    };
  }) =>
    Effect.gen(function* () {
      yield* notificationService.subscribePush(params.subscription);

      return {
        response: { success: true },
        status: 200,
      } as const satisfies ControllerResponse;
    });

  return {
    getNotifications,
    consumeNotifications,
    getVapidPublicKey,
    subscribePush,
  } as const;
});

export type INotificationController = InferEffect<typeof LayerImpl>;

export class NotificationController extends Context.Tag("NotificationController")<
  NotificationController,
  INotificationController
>() {
  static Live = Layer.effect(this, LayerImpl);
}
