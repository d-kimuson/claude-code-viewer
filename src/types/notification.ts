export type SessionNotificationType = "session_paused" | "session_completed";

export type SessionNotification = {
  id: string;
  projectId: string;
  sessionId: string;
  type: SessionNotificationType;
  createdAt: string;
};
