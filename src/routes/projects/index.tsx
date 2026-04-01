import { createFileRoute } from "@tanstack/react-router";
import { ProjectsPage } from "../../app/projects/page";
import { ProtectedRoute } from "../../components/ProtectedRoute";

const RouteComponent = () => {
  return (
    <ProtectedRoute>
      <ProjectsPage />
    </ProtectedRoute>
  );
};

export const Route = createFileRoute("/projects/")({
  component: RouteComponent,
});
