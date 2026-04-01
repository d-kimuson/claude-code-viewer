import type { ParsedUserMessage } from "../../../../server/core/claude-code/functions/parseUserMessage";

const stripLocalCommandCaveat = (text: string) => {
  return text.replace(/<local-command-caveat>[\s\S]*?<\/local-command-caveat>/g, "").trim();
};

/**
 * Resolves a session's display title with priority:
 * 1. customTitle (user-renamed via /rename)
 * 2. firstUserMessage-derived title
 * 3. fallback string (e.g. sessionId)
 */
export const resolveSessionTitle = (
  customTitle: string | null,
  firstUserMessage: ParsedUserMessage | null,
  fallback: string,
): string =>
  customTitle ?? (firstUserMessage ? firstUserMessageToTitle(firstUserMessage) : fallback);

export const firstUserMessageToTitle = (firstCommand: ParsedUserMessage) => {
  switch (firstCommand.kind) {
    case "command":
      if (firstCommand.commandArgs === undefined) {
        return firstCommand.commandName;
      }
      return `${firstCommand.commandName} ${firstCommand.commandArgs}`;
    case "local-command":
      return stripLocalCommandCaveat(firstCommand.stdout);
    case "text":
      return stripLocalCommandCaveat(firstCommand.content);
    default:
      firstCommand satisfies never;
      throw new Error("Invalid first command");
  }
};
