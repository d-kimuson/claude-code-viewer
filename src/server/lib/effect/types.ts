import type { Effect } from "effect";

// biome-ignore lint/suspicious/noExplicitAny: for type restriction
export type InferEffect<T> = T extends Effect.Effect<infer U, any, any>
  ? U
  : never;
