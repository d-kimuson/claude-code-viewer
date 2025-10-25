import { QueryClient } from "@tanstack/react-query";
import { latestSessionQuery } from "../../../../lib/api/queries";

interface LatestSessionPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function LatestSessionPage({
  params,
}: LatestSessionPageProps) {
  const { projectId } = await params;

  const queryClient = new QueryClient();

  const { latestSession } = await queryClient.fetchQuery(
    latestSessionQuery(projectId),
  );

  if (!latestSession) {
    // TODO: Soft Navigation
    window.location.href = "/projects";
  }

  // TODO: Soft Navigation
  window.location.href = `/projects/${projectId}/sessions/${latestSession?.id}`;
}
