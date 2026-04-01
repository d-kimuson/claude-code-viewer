import { useEffect, useRef } from "react";
import { honoClient } from "../api/client";

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

/**
 * Hook to subscribe the current browser to push notifications.
 * Should be called once near the app root after the service worker is registered.
 */
export const usePushSubscription = (): void => {
  const hasSubscribed = useRef(false);

  useEffect(() => {
    if (hasSubscribed.current) return;
    hasSubscribed.current = true;

    const subscribe = async () => {
      // Check if push is supported
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        return;
      }

      // Request permission
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        return;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Check for existing subscription
      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        // Already subscribed, send to server in case it's a new server instance
        await sendSubscriptionToServer(existingSubscription);
        return;
      }

      // Fetch VAPID public key
      const vapidResponse = await honoClient.api.notifications["vapid-public-key"].$get();

      if (!vapidResponse.ok) {
        console.warn("Failed to fetch VAPID public key");
        return;
      }

      const { publicKey } = await vapidResponse.json();

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      await sendSubscriptionToServer(subscription);
    };

    void subscribe().catch((error: unknown) => {
      console.warn("Failed to subscribe to push notifications:", error);
    });
  }, []);
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
