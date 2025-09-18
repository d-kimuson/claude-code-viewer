import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { projectDetailQuery } from "../../../lib/api/queries";
import { ProjectPageContent } from "./components/ProjectPage";

interface ProjectPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params;

  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: projectDetailQuery(projectId).queryKey,
    queryFn: projectDetailQuery(projectId).queryFn,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProjectPageContent projectId={projectId} />
    </HydrationBoundary>
  );
}
