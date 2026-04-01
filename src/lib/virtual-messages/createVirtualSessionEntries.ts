import type { VirtualMessage } from "./virtualMessageStore.ts";

/**
 * Creates virtual session list entries from virtual messages that don't yet
 * have a corresponding server-side session.
 */
export const createVirtualSessionEntries = (
  virtualMessages: ReadonlyMap<string, VirtualMessage>,
  projectId: string,
  existingSessionIds: ReadonlySet<string>,
) =>
  [...virtualMessages.values()]
    .filter((vm) => vm.projectId === projectId && !existingSessionIds.has(vm.sessionId))
    .map((vm) => ({
      id: vm.sessionId,
      jsonlFilePath: "",
      lastModifiedAt: vm.sentAt,
      meta: {
        messageCount: 0,
        firstUserMessage: {
          kind: "text" as const,
          content: vm.userMessage,
        },
        customTitle: null,
        cost: {
          totalUsd: 0,
          breakdown: {
            inputTokensUsd: 0,
            outputTokensUsd: 0,
            cacheCreationUsd: 0,
            cacheReadUsd: 0,
          },
          tokenUsage: {
            inputTokens: 0,
            outputTokens: 0,
            cacheCreationTokens: 0,
            cacheReadTokens: 0,
          },
        },
        modelName: null,
        prLinks: [],
      },
    }));
