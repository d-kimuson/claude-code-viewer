import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseJsonl } from "../parseJsonl";
import { decodeProjectId } from "../project/id";
import type { Session, SessionDetail } from "../types";
import { decodeSessionId, encodeSessionId } from "./id";
import { predictSessionsDatabase } from "./PredictSessionsDatabase";
import { sessionMetaStorage } from "./sessionMetaStorage";

const getTime = (date: string | null) => {
  if (date === null) return 0;
  return new Date(date).getTime();
};

export class SessionRepository {
  public async getSession(
    projectId: string,
    sessionId: string,
  ): Promise<{
    session: SessionDetail;
  }> {
    const sessionPath = decodeSessionId(projectId, sessionId);
    if (!existsSync(sessionPath)) {
      const predictSession =
        predictSessionsDatabase.getPredictSession(sessionId);
      if (predictSession) {
        return {
          session: predictSession,
        };
      }

      throw new Error("Session not found");
    }
    const content = await readFile(sessionPath, "utf-8");

    const conversations = parseJsonl(content);

    const sessionDetail: SessionDetail = {
      id: sessionId,
      jsonlFilePath: sessionPath,
      meta: await sessionMetaStorage.getSessionMeta(projectId, sessionId),
      conversations,
    };

    return {
      session: sessionDetail,
    };
  }

  public async getSessions(
    projectId: string,
  ): Promise<{ sessions: Session[] }> {
    try {
      const claudeProjectPath = decodeProjectId(projectId);
      const dirents = await readdir(claudeProjectPath, { withFileTypes: true });
      const sessions = await Promise.all(
        dirents
          .filter((d) => d.isFile() && d.name.endsWith(".jsonl"))
          .map(async (d) => ({
            id: encodeSessionId(resolve(claudeProjectPath, d.name)),
            jsonlFilePath: resolve(claudeProjectPath, d.name),
            meta: await sessionMetaStorage.getSessionMeta(
              projectId,
              encodeSessionId(resolve(claudeProjectPath, d.name)),
            ),
          })),
      );
      const sessionMap = new Map<string, Session>(
        sessions.map((session) => [session.id, session]),
      );

      const predictSessions = predictSessionsDatabase
        .getPredictSessions(projectId)
        .filter((session) => !sessionMap.has(session.id));

      return {
        sessions: [...predictSessions, ...sessions].sort((a, b) => {
          return (
            getTime(b.meta.lastModifiedAt) - getTime(a.meta.lastModifiedAt)
          );
        }),
      };
    } catch (error) {
      console.warn(`Failed to read sessions for project ${projectId}:`, error);
      return { sessions: [] };
    }
  }
}
