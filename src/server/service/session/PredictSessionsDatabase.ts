import { encodeProjectIdFromSessionFilePath } from "../project/id";
import type { Session, SessionDetail } from "../types";

/**
 * For interactively experience, handle sessions not already persisted to the filesystem.
 */
class PredictSessionsDatabase {
  private storage = new Map<string, SessionDetail>();

  public getPredictSessions(projectId: string): Session[] {
    return Array.from(this.storage.values()).filter(
      ({ jsonlFilePath }) =>
        encodeProjectIdFromSessionFilePath(jsonlFilePath) === projectId,
    );
  }

  public getPredictSession(sessionId: string): SessionDetail | null {
    return this.storage.get(sessionId) ?? null;
  }

  public createPredictSession(session: SessionDetail) {
    this.storage.set(session.id, session);
  }

  public deletePredictSession(sessionId: string) {
    this.storage.delete(sessionId);
  }
}

export const predictSessionsDatabase = new PredictSessionsDatabase();
