import { QueryClient } from "@tanstack/react-query";
import type { Metadata } from "next";
import {
  projectDetailQuery,
  sessionDetailQuery,
} from "../../../../../lib/api/queries";
import { SessionPageContent } from "./components/SessionPageContent";

type PageParams = {
  projectId: string;
  sessionId: string;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { projectId, sessionId } = await params;

  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    ...sessionDetailQuery(projectId, sessionId),
  });

  await queryClient.prefetchQuery({
    queryKey: projectDetailQuery(projectId).queryKey,
    queryFn: projectDetailQuery(projectId).queryFn,
  });

  return {
    title: `Session: ${sessionId.slice(0, 8)}...`,
    description: `View conversation session ${projectId}/${sessionId}`,
  };
}

interface SessionPageProps {
  params: Promise<PageParams>;
}

export default async function SessionPage({ params }: SessionPageProps) {
  const { projectId, sessionId } = await params;

  return <SessionPageContent projectId={projectId} sessionId={sessionId} />;
}
