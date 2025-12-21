import { Trans } from "@lingui/react";
import { createFileRoute } from "@tanstack/react-router";
import { Helmet } from "react-helmet-async";
import { z } from "zod";
import { useProject } from "../../../app/projects/[projectId]/hooks/useProject";
import { SessionPageContent } from "../../../app/projects/[projectId]/sessions/[sessionId]/components/SessionPageContent";
import { tabSchema } from "../../../app/projects/[projectId]/sessions/[sessionId]/components/sessionSidebar/schema";
import { NotFound } from "../../../components/NotFound";
import { ProtectedRoute } from "../../../components/ProtectedRoute";

const sessionSearchSchema = z.object({
  sessionId: z.string().optional(),
  tab: tabSchema.optional().default("sessions"),
  toolTypes: z.string().optional(),
  pathQuery: z.string().optional(),
});

export const Route = createFileRoute("/projects/$projectId/session")({
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

  const { sessionId, tab } = search;

  const title = projectName
    ? `${projectName} - Claude Code Viewer`
    : "Claude Code Viewer";

  return (
    <ProtectedRoute>
      <Helmet>
        <title>{title}</title>
      </Helmet>
      <SessionPageContent
        projectId={params.projectId}
        sessionId={sessionId}
        tab={tab}
      />
    </ProtectedRoute>
  );
}
