import { existsSync, statSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseJsonl } from "../parseJsonl";
import { decodeProjectId } from "../project/id";
import type { Session, SessionDetail } from "../types";
import { decodeSessionId, encodeSessionId } from "./id";
import { predictSessionsDatabase } from "./PredictSessionsDatabase";
import { sessionMetaStorage } from "./sessionMetaStorage";

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

      if (predictSession !== null) {
        return {
          session: predictSession,
        };
      }

      throw new Error("Session not found");
    }
    const content = await readFile(sessionPath, "utf-8");
    const allLines = content.split("\n").filter((line) => line.trim());

    const conversations = parseJsonl(allLines.join("\n"));

    const sessionDetail: SessionDetail = {
      id: sessionId,
      jsonlFilePath: sessionPath,
      meta: await sessionMetaStorage.getSessionMeta(projectId, sessionId),
      conversations,
      lastModifiedAt: statSync(sessionPath).mtime,
    };

    return {
      session: sessionDetail,
    };
  }

  public async getSessions(
    projectId: string,
    options?: {
      maxCount?: number;
      cursor?: string;
    },
  ): Promise<{ sessions: Session[] }> {
    const { maxCount = 20, cursor } = options ?? {};

    try {
      const claudeProjectPath = decodeProjectId(projectId);
      const dirents = await readdir(claudeProjectPath, { withFileTypes: true });
      const sessions = await Promise.all(
        dirents
          .filter((d) => d.isFile() && d.name.endsWith(".jsonl"))
          .map(async (d) => {
            const sessionId = encodeSessionId(
              resolve(claudeProjectPath, d.name),
            );
            const stats = statSync(resolve(claudeProjectPath, d.name));

            return {
              id: sessionId,
              jsonlFilePath: resolve(claudeProjectPath, d.name),
              lastModifiedAt: stats.mtime,
            };
          }),
      ).then((fetched) =>
        fetched.sort(
          (a, b) => b.lastModifiedAt.getTime() - a.lastModifiedAt.getTime(),
        ),
      );

      const sessionMap = new Map(
        sessions.map((session) => [session.id, session] as const),
      );

      const index =
        cursor !== undefined
          ? sessions.findIndex((session) => session.id === cursor)
          : -1;

      if (index !== -1) {
        return {
          sessions: await Promise.all(
            sessions
              .slice(index + 1, Math.min(index + 1 + maxCount, sessions.length))
              .map(async (item) => {
                return {
                  ...item,
                  meta: await sessionMetaStorage.getSessionMeta(
                    projectId,
                    item.id,
                  ),
                };
              }),
          ),
        };
      }

      const predictSessions = predictSessionsDatabase
        .getPredictSessions(projectId)
        .filter((session) => !sessionMap.has(session.id))
        .sort((a, b) => {
          return b.lastModifiedAt.getTime() - a.lastModifiedAt.getTime();
        });

      return {
        sessions: [
          ...predictSessions,
          ...(await Promise.all(
            sessions
              .slice(0, Math.min(maxCount, sessions.length))
              .map(async (item) => {
                return {
                  ...item,
                  meta: await sessionMetaStorage.getSessionMeta(
                    projectId,
                    item.id,
                  ),
                };
              }),
          )),
        ],
      };
    } catch (error) {
      console.warn(`Failed to read sessions for project ${projectId}:`, error);
      return { sessions: [] };
    }
  }
}
