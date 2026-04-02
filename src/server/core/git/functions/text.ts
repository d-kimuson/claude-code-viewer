export const parseLines = (output: string): string[] => {
  return output
    .trim()
    .split("\n")
    .filter((line) => line.trim() !== "");
};

export const stripAnsiColors = (text: string): string => {
  // ANSI escape sequence pattern: \x1B[...m
  // biome-ignore lint/suspicious/noControlCharactersInRegex: this is a valid regex
  // oxlint-disable-next-line no-control-regex -- intentional ANSI escape sequence matching
  return text.replace(/\x1B\[[0-9;]*m/g, "");
};
