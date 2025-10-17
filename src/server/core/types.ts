import type { z } from "zod";
import type { Conversation } from "../../lib/conversation-schema";
import type { projectMetaSchema } from "./project/schema";
import type { sessionMetaSchema } from "./session/schema";

export type Project = {
  id: string;
  claudeProjectPath: string;
  lastModifiedAt: Date;
  meta: ProjectMeta;
};

export type ProjectMeta = z.infer<typeof projectMetaSchema>;

export type Session = {
  id: string;
  jsonlFilePath: string;
  lastModifiedAt: Date;
  meta: SessionMeta;
};

export type SessionMeta = z.infer<typeof sessionMetaSchema>;

export type ErrorJsonl = {
  type: "x-error";
  line: string;
  lineNumber: number;
};

export type SessionDetail = Session & {
  conversations: (Conversation | ErrorJsonl)[];
};
