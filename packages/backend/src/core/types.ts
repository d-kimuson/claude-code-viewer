import type { ExtendedConversation } from "@claude-code-viewer/shared/conversation-schema/index";
import type { z } from "zod";
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

export type SessionDetail = Session & {
  conversations: ExtendedConversation[];
};
