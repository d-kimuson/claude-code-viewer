import type { z } from "zod";
import type { Conversation } from "../../lib/conversation-schema";
import type { projectMetaSchema, sessionMetaSchema } from "./schema";

export type Project = {
  id: string;
  claudeProjectPath: string;
  meta: ProjectMeta;
};

export type ProjectMeta = z.infer<typeof projectMetaSchema>;

export type Session = {
  id: string;
  jsonlFilePath: string;
  meta: SessionMeta;
};

export type SessionMeta = z.infer<typeof sessionMetaSchema>;

export type ErrorJsonl = {
  type: "x-error";
  line: string;
};

export type SessionDetail = Session & {
  conversations: (Conversation | ErrorJsonl)[];
};
