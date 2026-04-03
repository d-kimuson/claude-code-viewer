/// <reference lib="webworker" />

import { ExpirationPlugin } from "workbox-expiration";
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { NetworkFirst, NetworkOnly } from "workbox-strategies";

declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

// Precache assets from the Vite build manifest
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Navigation route for SPA
const handler = createHandlerBoundToURL("/index.html");
const navigationRoute = new NavigationRoute(handler, {
  denylist: [/^\/api\//],
});
registerRoute(navigationRoute);

// SSE must never be cached
registerRoute(/\/api\/sse/, new NetworkOnly());

// API calls: NetworkFirst with expiration
registerRoute(
  /^.*\/api\/.*/i,
  new NetworkFirst({
    cacheName: "api-cache",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 60,
      }),
    ],
  }),
);

// Push notification handling
type PushNotificationData = {
  title: string;
  body: string;
  url?: string;
};

self.addEventListener("push", (event) => {
  if (!event.data) return;

  // oxlint-disable-next-line no-unsafe-type-assertion -- Push event data is typed by our server
  const data = event.data.json() as PushNotificationData;

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192x192.png",
      badge: "/icon-192x192.png",
      data: { url: data.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  // oxlint-disable-next-line no-unsafe-type-assertion -- Notification data is set by our push handler
  const url = (event.notification.data as { url?: string } | undefined)?.url ?? "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clientList) => {
      // Navigate and focus existing window if available
      for (const client of clientList) {
        if ("navigate" in client) {
          return client.navigate(url).then((c) => c?.focus());
        }
      }
      // Otherwise open new window
      return self.clients.openWindow(url);
    }),
  );
});
