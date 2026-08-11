export type AnsiIntensitySegment = {
  readonly text: string;
  readonly bold: boolean;
  readonly dim: boolean;
};

type IntensityState = {
  readonly bold: boolean;
  readonly dim: boolean;
};

const NORMAL_INTENSITY: IntensityState = {
  bold: false,
  dim: false,
};

const escapeCharacter = String.fromCodePoint(27);
const sgrSequence = new RegExp(
  `(?:${escapeCharacter}|\\\\u001b|\\\\x1b|\\\\?\\^\\[)\\[([0-9;]*)m`,
  "giu",
);

const applySgrCode = (state: IntensityState, code: number): IntensityState => {
  switch (code) {
    case 0:
    case 22:
      return NORMAL_INTENSITY;
    case 1:
      return { ...state, bold: true };
    case 2:
      return { ...state, dim: true };
    default:
      return state;
  }
};

const applySgrParameters = (state: IntensityState, parameters: string): IntensityState => {
  const codes = parameters === "" ? [0] : parameters.split(";").map(Number);
  return codes.reduce(applySgrCode, state);
};

const appendSegment = (
  segments: AnsiIntensitySegment[],
  text: string,
  state: IntensityState,
): void => {
  if (text === "") return;

  const previous = segments.at(-1);
  if (previous?.bold === state.bold && previous.dim === state.dim) {
    segments[segments.length - 1] = {
      ...previous,
      text: previous.text + text,
    };
    return;
  }

  segments.push({
    text,
    bold: state.bold,
    dim: state.dim,
  });
};

export const parseAnsiIntensity = (text: string): readonly AnsiIntensitySegment[] => {
  const segments: AnsiIntensitySegment[] = [];
  let state = NORMAL_INTENSITY;
  let offset = 0;

  for (const match of text.matchAll(sgrSequence)) {
    const matchIndex = match.index;
    appendSegment(segments, text.slice(offset, matchIndex), state);
    state = applySgrParameters(state, match[1] ?? "");
    offset = matchIndex + match[0].length;
  }

  appendSegment(segments, text.slice(offset), state);
  return segments;
};

export const stripAnsiSgr = (text: string): string =>
  parseAnsiIntensity(text)
    .map((segment) => segment.text)
    .join("");
