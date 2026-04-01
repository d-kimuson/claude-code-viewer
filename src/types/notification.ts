export type SessionNotificationType =
  | "session_paused"
  | "session_completed"
  | "permission_requested"
  | "question_asked";

export type SessionNotification = {
  id: string;
  projectId: string;
  sessionId: string;
  type: SessionNotificationType;
  createdAt: string;
};
