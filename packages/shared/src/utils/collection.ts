export const typedIncludes = <const T>(
  array: readonly T[],
  value: unknown,
): value is T => (array as unknown[]).includes(value);
