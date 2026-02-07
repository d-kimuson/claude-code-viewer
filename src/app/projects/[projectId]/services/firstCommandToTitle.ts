import type { ParsedUserMessage } from "../../../../server/core/claude-code/functions/parseUserMessage";

const stripLocalCommandCaveat = (text: string) => {
  return text
    .replace(/<local-command-caveat>[\s\S]*?<\/local-command-caveat>/g, "")
    .trim();
};

export const firstUserMessageToTitle = (firstCommand: ParsedUserMessage) => {
  switch (firstCommand.kind) {
    case "command":
      if (firstCommand.commandArgs === undefined) {
        return firstCommand.commandName;
      }
      return `${firstCommand.commandName} ${firstCommand.commandArgs}`;
    case "local-command":
      return stripLocalCommandCaveat(firstCommand.stdout) || "Local Command";
    case "text":
      return stripLocalCommandCaveat(firstCommand.content) || "Local Command";
    default:
      firstCommand satisfies never;
      throw new Error("Invalid first command");
  }
};
