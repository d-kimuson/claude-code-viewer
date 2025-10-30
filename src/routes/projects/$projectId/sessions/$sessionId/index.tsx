import { Trans } from "@lingui/react";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";
import { useProject } from "../../../../../app/projects/[projectId]/hooks/useProject";
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
  const { data } = useProject(params.projectId);
  const projectName = data.pages[0]?.project.meta.projectName;

  const title = projectName
    ? `${projectName} - Claude Code Viewer`
    : "Claude Code Viewer";

  return (
    <>
      <Helmet>
        <title>{title}</title>
      </Helmet>
      <SessionPageContent
        projectId={params.projectId}
        sessionId={params.sessionId}
      />
    </>
  );
}
