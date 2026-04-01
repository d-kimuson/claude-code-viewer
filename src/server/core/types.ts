import type { z } from "zod";
import type { Conversation } from "../../lib/conversation-schema/index.ts";
import type { projectMetaSchema } from "./project/schema.ts";
import type { sessionMetaSchema } from "./session/schema.ts";

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

export type ExtendedConversation = Conversation | ErrorJsonl;

export type SessionDetail = Session & {
  conversations: ExtendedConversation[];
};
