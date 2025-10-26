import { createFileRoute } from "@tanstack/react-router";
import { SessionPageContent } from "../../../../../app/projects/[projectId]/sessions/[sessionId]/components/SessionPageContent";

export const Route = createFileRoute(
  "/projects/$projectId/sessions/$sessionId/",
)({
  component: RouteComponent,
});

function RouteComponent() {
  const params = Route.useParams();
  return (
    <SessionPageContent
      projectId={params.projectId}
      sessionId={params.sessionId}
    />
  );
}
