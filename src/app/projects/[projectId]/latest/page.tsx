import { QueryClient } from "@tanstack/react-query";
import { redirect } from "next/navigation";
import { latestSessionQuery } from "../../../../lib/api/queries";
import { initializeI18n } from "../../../../lib/i18n/initializeI18n";

interface LatestSessionPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function LatestSessionPage({
  params,
}: LatestSessionPageProps) {
  await initializeI18n();

  const { projectId } = await params;

  const queryClient = new QueryClient();

  const { latestSession } = await queryClient.fetchQuery(
    latestSessionQuery(projectId),
  );

  if (!latestSession) {
    redirect(`/projects`);
  }

  redirect(`/projects/${projectId}/sessions/${latestSession.id}`);
}
