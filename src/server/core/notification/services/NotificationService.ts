import { FileSystem } from "@effect/platform";
import { Context, Effect, Layer, Ref } from "effect";
import { ulid } from "ulid";
import webpush from "web-push";
import { z } from "zod";
import type {
  SessionNotification,
  SessionNotificationType,
} from "../../../../types/notification.ts";
import type { InferEffect } from "../../../lib/effect/types.ts";
import { EventBus } from "../../events/services/EventBus.ts";

type PushSubscriptionRecord = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

const vapidKeysSchema = z.object({
  publicKey: z.string(),
  privateKey: z.string(),
});

type VapidKeys = z.infer<typeof vapidKeysSchema>;

const VAPID_KEYS_FILENAME = ".claude-code-viewer/vapid-keys.json";

const getVapidKeysPath = (fs: FileSystem.FileSystem) =>
  Effect.gen(function* () {
    // biome-ignore lint/style/noProcessEnv: required for home directory
    // oxlint-disable-next-line node/no-process-env -- configuration boundary
    const home = process.env.HOME ?? process.env.USERPROFILE ?? "/tmp";
    const dirPath = `${home}/.claude-code-viewer`;

    const dirExists = yield* fs.exists(dirPath);
    if (!dirExists) {
      yield* fs.makeDirectory(dirPath, { recursive: true });
    }

    return `${home}/${VAPID_KEYS_FILENAME}`;
  });

const loadOrCreateVapidKeys = (fs: FileSystem.FileSystem) =>
  Effect.gen(function* () {
    const keysPath = yield* getVapidKeysPath(fs);
    const exists = yield* fs.exists(keysPath);

    if (exists) {
      const content = yield* fs.readFileString(keysPath);
      return vapidKeysSchema.parse(JSON.parse(content));
    }

    const keys = webpush.generateVAPIDKeys();
    const vapidKeys: VapidKeys = {
      publicKey: keys.publicKey,
      privateKey: keys.privateKey,
    };

    yield* fs.writeFileString(keysPath, JSON.stringify(vapidKeys, null, 2));

    return vapidKeys;
  });

const LayerImpl = Effect.gen(function* () {
  const notificationsRef = yield* Ref.make<SessionNotification[]>([]);
  const pushSubscriptionsRef = yield* Ref.make<PushSubscriptionRecord[]>([]);
  const eventBus = yield* EventBus;
  const fs = yield* FileSystem.FileSystem;

  // Load or generate VAPID keys
  const vapidKeys = yield* loadOrCreateVapidKeys(fs).pipe(
    Effect.catchAll((error) => {
      console.warn("Failed to load VAPID keys, generating in-memory:", error);
      const keys = webpush.generateVAPIDKeys();
      return Effect.succeed({
        publicKey: keys.publicKey,
        privateKey: keys.privateKey,
      });
    }),
  );
  webpush.setVapidDetails(
    "mailto:noreply@claude-code-viewer.local",
    vapidKeys.publicKey,
    vapidKeys.privateKey,
  );

  // Subscribe to session process state changes to auto-create notifications
  yield* eventBus.on("sessionProcessChanged", (event) => {
    const { changed } = event;

    if (changed.type === "paused" || changed.type === "completed") {
      const notificationType: SessionNotificationType =
        changed.type === "paused" ? "session_paused" : "session_completed";

      Effect.runFork(
        createNotification({
          projectId: changed.def.projectId,
          sessionId: changed.sessionId,
          type: notificationType,
        }),
      );
    }
  });

  // Subscribe to permission requests
  yield* eventBus.on("permissionRequested", (event) => {
    Effect.runFork(
      createNotification({
        projectId: event.permissionRequest.projectId,
        sessionId: event.permissionRequest.sessionId,
        type: "permission_requested",
      }),
    );
  });

  // Subscribe to question requests
  yield* eventBus.on("questionRequested", (event) => {
    Effect.runFork(
      createNotification({
        projectId: event.questionRequest.projectId,
        sessionId: event.questionRequest.sessionId,
        type: "question_asked",
      }),
    );
  });

  const getNotifications = (): Effect.Effect<SessionNotification[]> => Ref.get(notificationsRef);

  const createNotification = (params: {
    projectId: string;
    sessionId: string;
    type: SessionNotificationType;
  }): Effect.Effect<SessionNotification> =>
    Effect.gen(function* () {
      const notification: SessionNotification = {
        id: ulid(),
        projectId: params.projectId,
        sessionId: params.sessionId,
        type: params.type,
        createdAt: new Date().toISOString(),
      };

      yield* Ref.update(notificationsRef, (notifications) => [...notifications, notification]);

      yield* eventBus.emit("notificationCreated", { notification });

      // Send push notifications to all subscribed clients
      yield* sendPushNotifications(notification);

      return notification;
    });

  const consumeNotifications = (
    sessionId: string,
    options?: { types?: SessionNotificationType[] },
  ): Effect.Effect<void> =>
    Effect.gen(function* () {
      const notifications = yield* Ref.get(notificationsRef);
      const types = options?.types;

      const shouldConsume = (n: SessionNotification) =>
        n.sessionId === sessionId && (types === undefined || types.includes(n.type));

      const hasMatch = notifications.some(shouldConsume);

      if (!hasMatch) {
        return;
      }

      yield* Ref.update(notificationsRef, (notifications) =>
        notifications.filter((n) => !shouldConsume(n)),
      );

      yield* eventBus.emit("notificationConsumed", { sessionId });
    });

  const getVapidPublicKey = (): Effect.Effect<string> => Effect.succeed(vapidKeys.publicKey);

  const subscribePush = (subscription: PushSubscriptionRecord): Effect.Effect<void> =>
    Ref.update(pushSubscriptionsRef, (subscriptions) => {
      // Avoid duplicates by endpoint
      const filtered = subscriptions.filter((s) => s.endpoint !== subscription.endpoint);
      return [...filtered, subscription];
    });

  const sendPushNotifications = (notification: SessionNotification): Effect.Effect<void> =>
    Effect.gen(function* () {
      const subscriptions = yield* Ref.get(pushSubscriptionsRef);
      if (subscriptions.length === 0) return;

      const titleMap: Record<SessionNotificationType, string> = {
        session_paused: "Session Paused",
        session_completed: "Session Completed",
        permission_requested: "Permission Required",
        question_asked: "Question from Claude",
      };
      const title = titleMap[notification.type];

      const body = `Session ${notification.sessionId.slice(0, 8)}...`;
      const url = `/projects/${notification.projectId}/session?sessionId=${notification.sessionId}`;

      const payload = JSON.stringify({ title, body, url });

      // Send to all subscriptions, remove invalid ones
      const invalidEndpoints: string[] = [];

      yield* Effect.forEach(
        subscriptions,
        (sub) =>
          Effect.tryPromise({
            try: () =>
              webpush.sendNotification(
                {
                  endpoint: sub.endpoint,
                  keys: sub.keys,
                },
                payload,
              ),
            catch: () => {
              invalidEndpoints.push(sub.endpoint);
            },
          }).pipe(Effect.catchAll(() => Effect.void)),
        { concurrency: "unbounded" },
      );

      // Clean up invalid subscriptions
      if (invalidEndpoints.length > 0) {
        yield* Ref.update(pushSubscriptionsRef, (subs) =>
          subs.filter((s) => !invalidEndpoints.includes(s.endpoint)),
        );
      }
    });

  return {
    getNotifications,
    createNotification,
    consumeNotifications,
    getVapidPublicKey,
    subscribePush,
  } as const;
});

export type INotificationService = InferEffect<typeof LayerImpl>;

export class NotificationService extends Context.Tag("NotificationService")<
  NotificationService,
  INotificationService
>() {
  static Live = Layer.effect(this, LayerImpl);
}
