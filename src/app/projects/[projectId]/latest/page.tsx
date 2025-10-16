import { QueryClient } from "@tanstack/react-query";
import { redirect } from "next/navigation";
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
    redirect(`/projects`);
  }

  redirect(
    `/projects/${encodeURIComponent(projectId)}/sessions/${encodeURIComponent(latestSession.id)}`,
  );
}
