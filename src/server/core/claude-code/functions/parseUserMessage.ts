import { z } from "zod";

const regExp = /<(?<tag>[^>]+)>(?<content>[\s\S]*?)<\/\k<tag>>/g;

const matchSchema = z.object({
  tag: z.string(),
  content: z.string(),
});

export const parsedUserMessageSchema = z.union([
  z.object({
    kind: z.literal("command"),
    commandName: z.string(),
    commandArgs: z.string().optional(),
    commandMessage: z.string().optional(),
  }),
  z.object({
    kind: z.literal("local-command"),
    stdout: z.string(),
  }),
  z.object({
    kind: z.literal("text"),
    content: z.string(),
  }),
]);

export type ParsedUserMessage = z.infer<typeof parsedUserMessageSchema>;

export const parseUserMessage = (content: string): ParsedUserMessage => {
  const matches = Array.from(content.matchAll(regExp))
    .map((match) => matchSchema.safeParse(match.groups))
    .filter((result) => result.success)
    .map((result) => result.data);

  if (matches.length === 0) {
    return {
      kind: "text",
      content,
    };
  }

  const commandName = matches.find(
    (match) => match.tag === "command-name",
  )?.content;
  const commandArgs = matches.find(
    (match) => match.tag === "command-args",
  )?.content;
  const commandMessage = matches.find(
    (match) => match.tag === "command-message",
  )?.content;
  const localCommandStdout = matches.find(
    (match) => match.tag === "local-command-stdout",
  )?.content;

  switch (true) {
    case commandName !== undefined:
      return {
        kind: "command",
        commandName,
        commandArgs,
        commandMessage,
      };
    case localCommandStdout !== undefined:
      return {
        kind: "local-command",
        stdout: localCommandStdout,
      };
    default:
      return {
        kind: "text",
        content,
      };
  }
};
