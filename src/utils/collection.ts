export const typedIncludes = <const T>(array: readonly T[], value: unknown): value is T =>
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- narrowing readonly T[] to unknown[] for Array.includes compatibility
  (array as unknown[]).includes(value);
