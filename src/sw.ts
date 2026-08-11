/// <reference lib="webworker" />

import { ExpirationPlugin } from "workbox-expiration";
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { NetworkFirst, NetworkOnly } from "workbox-strategies";
import { getBasePathHref, joinBasePath, normalizeBasePath } from "./lib/base-path/basePath";

declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");

const basePath = normalizeBasePath(new URL(self.registration.scope).pathname);
const apiPath = joinBasePath(basePath, "/api");
const ssePath = joinBasePath(basePath, "/api/sse");

// Precache assets from the Vite build manifest
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Navigation route for SPA
const precachedNavigationHandler = createHandlerBoundToURL(joinBasePath(basePath, "/index.html"));
const navigationHandler: typeof precachedNavigationHandler = async (options) => {
  const response = await precachedNavigationHandler(options);
  const html = await response.text();
  const headers = new Headers(response.headers);
  headers.delete("Content-Length");
  return new Response(
    html.replace('<base href="./" />', `<base href="${getBasePathHref(basePath)}" />`),
    {
      status: response.status,
      statusText: response.statusText,
      headers,
    },
  );
};
const navigationRoute = new NavigationRoute(navigationHandler, {
  denylist: [new RegExp(`^${escapeRegExp(apiPath)}(?:/|$)`, "u")],
});
registerRoute(navigationRoute);

// SSE must never be cached
registerRoute(({ url }) => url.pathname === ssePath, new NetworkOnly());

// API calls: NetworkFirst with expiration
registerRoute(
  ({ url }) => url.pathname === apiPath || url.pathname.startsWith(`${apiPath}/`),
  new NetworkFirst({
    cacheName: `api-cache:${basePath}`,
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

const parsePushNotificationData = (value: unknown): PushNotificationData | undefined => {
  if (
    typeof value !== "object" ||
    value === null ||
    !("title" in value) ||
    typeof value.title !== "string" ||
    !("body" in value) ||
    typeof value.body !== "string"
  ) {
    return undefined;
  }
  const url = "url" in value ? value.url : undefined;
  if (url !== undefined && typeof url !== "string") return undefined;
  return {
    title: value.title,
    body: value.body,
    ...(url === undefined ? {} : { url }),
  };
};

const getNotificationUrl = (value: unknown): string | undefined => {
  if (typeof value !== "object" || value === null || !("url" in value)) return undefined;
  return typeof value.url === "string" ? value.url : undefined;
};

self.addEventListener("push", (event) => {
  if (!event.data) return;

  const data = parsePushNotificationData(event.data.json());
  if (data === undefined) return;

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: joinBasePath(basePath, "/icon-192x192.png"),
      badge: joinBasePath(basePath, "/icon-192x192.png"),
      data: { url: data.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const notificationUrl = getNotificationUrl(event.notification.data);
  const url =
    notificationUrl === undefined
      ? getBasePathHref(basePath)
      : notificationUrl.startsWith("http://") || notificationUrl.startsWith("https://")
        ? notificationUrl
        : notificationUrl === basePath || notificationUrl.startsWith(`${basePath}/`)
          ? notificationUrl
          : joinBasePath(
              basePath,
              notificationUrl.startsWith("/") ? notificationUrl : `/${notificationUrl}`,
            );

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Focus and navigate existing window if available
      const [firstClient] = clientList;
      if (firstClient) {
        return firstClient.focus().then((c) => c?.navigate(url));
      }
      // Otherwise open new window
      return self.clients.openWindow(url);
    }),
  );
});
