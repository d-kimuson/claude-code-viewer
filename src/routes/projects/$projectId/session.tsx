import { Trans } from "@lingui/react";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { SessionPageContent } from "../../../app/projects/[projectId]/sessions/[sessionId]/components/SessionPageContent";
import { tabSchema } from "../../../app/projects/[projectId]/sessions/[sessionId]/components/sessionSidebar/schema";
import { NotFound } from "../../../components/NotFound";
import { ProtectedRoute } from "../../../components/ProtectedRoute";

const rightPanelTabSchema = z.enum(["explorer", "git", "review", "browser"]);

const sessionSearchSchema = z.object({
  sessionId: z.string().optional(),
  tab: tabSchema.optional().default("sessions"),
  rightPanel: z.boolean().optional(),
  rightPanelTab: rightPanelTabSchema.optional().default("explorer"),
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
  const { sessionId, tab } = search;

  return (
    <ProtectedRoute>
      <SessionPageContent
        projectId={params.projectId}
        sessionId={sessionId}
        tab={tab}
      />
    </ProtectedRoute>
  );
}
