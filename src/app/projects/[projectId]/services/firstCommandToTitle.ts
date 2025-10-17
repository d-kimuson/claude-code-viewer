import type { ParsedCommand } from "../../../../server/core/claude-code/functions/parseCommandXml";

export const firstCommandToTitle = (firstCommand: ParsedCommand) => {
  switch (firstCommand.kind) {
    case "command":
      if (firstCommand.commandArgs === undefined) {
        return firstCommand.commandName;
      }
      return `${firstCommand.commandName} ${firstCommand.commandArgs}`;
    case "local-command":
      return firstCommand.stdout;
    case "text":
      return firstCommand.content;
    default:
      firstCommand satisfies never;
      throw new Error("Invalid first command");
  }
};
