import { SessionPageContent } from "./components/SessionPageContent";

type PageParams = {
  projectId: string;
  sessionId: string;
};

interface SessionPageProps {
  params: Promise<PageParams>;
}

export default async function SessionPage({ params }: SessionPageProps) {
  const { projectId, sessionId } = await params;
  return <SessionPageContent projectId={projectId} sessionId={sessionId} />;
}
