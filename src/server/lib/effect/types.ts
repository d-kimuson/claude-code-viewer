import type { Effect } from "effect";

export type InferEffect<T> =
  // biome-ignore lint/suspicious/noExplicitAny: for type restriction
  // oxlint-disable-next-line typescript/no-explicit-any -- `any` is required for type-level pattern matching in conditional types
  T extends Effect.Effect<infer U, any, any> ? U : never;
