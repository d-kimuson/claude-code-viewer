export type PublicSessionProcess = {
  id: string;
  projectId: string;
  sessionId: string;
  status: "paused" | "running";
  queuedMessageCount: number;
  queuedMessages: readonly { text: string; queuedAt: string }[];
};
