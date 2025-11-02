import { Trans } from "@lingui/react";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";
import { z } from "zod";
import { useProject } from "../../../../../app/projects/[projectId]/hooks/useProject";
import { SessionPageContent } from "../../../../../app/projects/[projectId]/sessions/[sessionId]/components/SessionPageContent";
import { tabSchema } from "../../../../../app/projects/[projectId]/sessions/[sessionId]/components/sessionSidebar/schema";
import { NotFound } from "../../../../../components/NotFound";

const sessionSearchSchema = z.object({
  tab: tabSchema.optional().default("sessions"),
});

export const Route = createFileRoute(
  "/projects/$projectId/sessions/$sessionId/",
)({
  validateSearch: sessionSearchSchema,
  component: RouteComponent,
  notFoundComponent: () => (
    <NotFound
      message={<Trans id="notfound.session.title" />}
      description={<Trans id="notfound.session.description" />}
    />
  ),
});

function RouteComponent() {
  const params = Route.useParams();
  const search = Route.useSearch();
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
        tab={search.tab}
      />
    </>
  );
}
