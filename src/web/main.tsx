import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { NotFound } from "./components/NotFound";
import { QueryClientProviderWrapper } from "./lib/api/QueryClientProviderWrapper";
import { routeTree } from "./routeTree.gen";
import "./styles.css";

const ONE_HOUR_MS = 60 * 60 * 1000;

registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    if (registration) {
      setInterval(() => {
        void registration.update();
      }, ONE_HOUR_MS);
    }
  },
});

const router = createRouter({
  routeTree,
  context: {},
  defaultPreload: "intent",
  scrollRestoration: true,
  defaultStructuralSharing: true,
  defaultPreloadStaleTime: 0,
  defaultNotFoundComponent: () => <NotFound />,
});

declare module "@tanstack/react-router" {
  // oxlint-disable-next-line consistent-type-definitions -- for declaration merging
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById("app");
if (rootElement && !rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <StrictMode>
      <QueryClientProviderWrapper>
        <RouterProvider router={router} />
      </QueryClientProviderWrapper>
    </StrictMode>,
  );
}
