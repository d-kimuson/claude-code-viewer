import { createFileRoute } from "@tanstack/react-router";
import { RemoteSessionPage } from "../app/remote/RemoteSessionPage";

export const Route = createFileRoute("/remote")({
  component: RemoteSessionPage,
});
