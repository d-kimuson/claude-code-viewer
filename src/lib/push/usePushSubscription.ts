import { useEffect, useRef } from "react";
import { honoClient } from "../../web/lib/api/client.ts";

const urlBase64ToUint8Array = (base64String: string): ArrayBuffer => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer;
};

const isPushSupported = (): boolean =>
  "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

const subscribeToServer = async (options?: { forceResubscribe?: boolean }): Promise<void> => {
  const forceResubscribe = options?.forceResubscribe === true;
  const registration = await navigator.serviceWorker.ready;

  const existingSubscription = await registration.pushManager.getSubscription();
  if (existingSubscription && !forceResubscribe) {
    await sendSubscriptionToServer(existingSubscription);
    return;
  }

  if (existingSubscription && forceResubscribe) {
    await existingSubscription.unsubscribe();
  }

  const currentSubscription = await registration.pushManager.getSubscription();
  if (currentSubscription) {
    await sendSubscriptionToServer(currentSubscription);
    return;
  }

  const vapidResponse = await honoClient.api.notifications["vapid-public-key"].$get();
  if (!vapidResponse.ok) {
    return;
  }

  const { publicKey } = await vapidResponse.json();

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });

  await sendSubscriptionToServer(subscription);
};

/**
 * Hook to subscribe the current browser to push notifications.
 * Only auto-subscribes if permission is already granted (e.g. after server restart).
 * To request permission for the first time, call requestPushPermissionAndSubscribe
 * from a user gesture (button click).
 */
export const usePushSubscription = (): void => {
  const hasSubscribed = useRef(false);

  useEffect(() => {
    if (hasSubscribed.current) return;
    hasSubscribed.current = true;

    if (!isPushSupported()) return;
    if (Notification.permission !== "granted") return;

    void subscribeToServer().catch((_error: unknown) => {});
  }, []);
};

/**
 * Request notification permission and subscribe to push notifications.
 * Must be called from a user gesture (e.g. button click) for iOS compatibility.
 */
export const requestPushPermissionAndSubscribe = async (): Promise<NotificationPermission> => {
  if (!isPushSupported()) return "denied";

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission;

  await subscribeToServer({ forceResubscribe: true });
  return permission;
};

const sendSubscriptionToServer = async (subscription: PushSubscription): Promise<void> => {
  const json = subscription.toJSON();
  if (json.endpoint === undefined || json.endpoint === "" || json.keys === undefined) return;

  const p256dh = json.keys.p256dh;
  const auth = json.keys.auth;
  if (p256dh === undefined || p256dh === "" || auth === undefined || auth === "") return;

  await honoClient.api.notifications["push-subscription"].$post({
    json: {
      endpoint: json.endpoint,
      keys: { p256dh, auth },
    },
  });
};
