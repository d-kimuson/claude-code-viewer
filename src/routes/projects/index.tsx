import { createFileRoute } from "@tanstack/react-router";
import { ProjectsPage } from "../../app/projects/page";
import { ProtectedRoute } from "../../components/ProtectedRoute";

export const Route = createFileRoute("/projects/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <ProtectedRoute>
      <ProjectsPage />
    </ProtectedRoute>
  );
}
