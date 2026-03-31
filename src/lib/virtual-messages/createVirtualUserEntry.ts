import type { UserEntry } from "@/lib/conversation-schema/entry/UserEntrySchema";
import type { VirtualMessage } from "./virtualMessageStore";

export const createVirtualUserEntry = (message: VirtualMessage): UserEntry => {
  return {
    type: "user",
    message: {
      role: "user",
      content: message.userMessage,
    },
    isSidechain: false,
    userType: "external",
    cwd: "",
    sessionId: message.sessionId,
    version: "virtual",
    uuid: `vc__${message.sessionId}__${message.sentAt}`,
    timestamp: message.sentAt,
    parentUuid: null,
  };
};
