import { Context, Effect, Layer } from "effect";
import type { ControllerResponse } from "../../../lib/effect/toEffectResponse";
import type { InferEffect } from "../../../lib/effect/types";
import { NotificationService } from "../services/NotificationService";

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

  const consumeNotifications = (params: { sessionId: string }) =>
    Effect.gen(function* () {
      yield* notificationService.consumeNotifications(params.sessionId);

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

export class NotificationController extends Context.Tag(
  "NotificationController",
)<NotificationController, INotificationController>() {
  static Live = Layer.effect(this, LayerImpl);
}
