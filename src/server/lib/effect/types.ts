import type { Effect } from "effect";

export type InferEffect<T> =
  // biome-ignore lint/suspicious/noExplicitAny: for type restriction
  T extends Effect.Effect<infer U, any, any> ? U : never;
