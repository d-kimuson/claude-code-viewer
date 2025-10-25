import { createFileRoute } from "@tanstack/react-router";
import { ProjectsPage } from "../../app/projects/page";

export const Route = createFileRoute("/projects/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <ProjectsPage />;
}
