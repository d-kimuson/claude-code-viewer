export type PublicSessionProcess = {
  id: string;
  projectId: string;
  sessionId: string;
  status: "paused" | "running";
};
