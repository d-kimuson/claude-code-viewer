import { Trans } from "@lingui/react";
import { createFileRoute } from "@tanstack/react-router";
import { SessionPageContent } from "../../../../../app/projects/[projectId]/sessions/[sessionId]/components/SessionPageContent";
import { NotFound } from "../../../../../components/NotFound";

export const Route = createFileRoute(
  "/projects/$projectId/sessions/$sessionId/",
)({
  component: RouteComponent,
  notFoundComponent: () => (
    <NotFound
      message={
        <Trans id="notfound.session.title" message="Session Not Found" />
      }
      description={
        <Trans
          id="notfound.session.description"
          message="The session you are looking for does not exist."
        />
      }
    />
  ),
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
