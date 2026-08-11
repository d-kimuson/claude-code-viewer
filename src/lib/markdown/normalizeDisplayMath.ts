type FenceMarker = "`" | "~";

type Fence = {
  readonly marker: FenceMarker;
  readonly length: number;
};

type FenceRun = Fence & {
  readonly rest: string;
};

const stripContainerMarkers = (line: string): string => {
  let content = line;

  while (true) {
    const blockquote = /^ {0,3}>[\t ]?(.*)$/u.exec(content);
    if (blockquote !== null) {
      content = blockquote[1] ?? "";
      continue;
    }

    const listItem = /^ {0,3}(?:[-+*]|\d+[.)])[\t ]+(.*)$/u.exec(content);
    if (listItem !== null) {
      content = listItem[1] ?? "";
      continue;
    }

    return content;
  }
};

const getFenceRun = (line: string): FenceRun | undefined => {
  const containerContent = stripContainerMarkers(line);
  const content = containerContent.trimStart();
  if (containerContent.length - content.length > 3) return undefined;

  const firstCharacter = content[0];
  if (firstCharacter !== "`" && firstCharacter !== "~") return undefined;

  let length = 0;
  while (content[length] === firstCharacter) {
    length += 1;
  }
  if (length < 3) return undefined;

  return {
    marker: firstCharacter,
    length,
    rest: content.slice(length),
  };
};

const isEscaped = (text: string, index: number): boolean => {
  let backslashCount = 0;
  for (let cursor = index - 1; cursor >= 0 && text[cursor] === "\\"; cursor -= 1) {
    backslashCount += 1;
  }
  return backslashCount % 2 === 1;
};

const containsUnescapedDelimiter = (text: string): boolean => {
  let index = text.indexOf("$$");
  while (index !== -1) {
    if (!isEscaped(text, index)) return true;
    index = text.indexOf("$$", index + 2);
  }
  return false;
};

const normalizeStandaloneDisplayMath = (line: string): string => {
  if (line !== line.trimStart()) return line;

  const trimmed = line.trimEnd();
  if (!trimmed.startsWith("$$") || !trimmed.endsWith("$$") || trimmed.length <= 4) {
    return line;
  }

  const closingDelimiterIndex = trimmed.length - 2;
  if (isEscaped(trimmed, closingDelimiterIndex)) return line;

  const expression = trimmed.slice(2, closingDelimiterIndex).trim();
  if (expression === "" || containsUnescapedDelimiter(expression)) return line;

  return `\n\n$$\n${expression}\n$$\n\n`;
};

export const normalizeDisplayMath = (content: string): string => {
  let fence: Fence | undefined;

  return content
    .split("\n")
    .map((line) => {
      const fenceRun = getFenceRun(line);
      if (fence !== undefined) {
        if (
          fenceRun?.marker === fence.marker &&
          fenceRun.length >= fence.length &&
          fenceRun.rest.trim() === ""
        ) {
          fence = undefined;
        }
        return line;
      }

      if (fenceRun !== undefined) {
        fence = fenceRun;
        return line;
      }

      return normalizeStandaloneDisplayMath(line);
    })
    .join("\n");
};
