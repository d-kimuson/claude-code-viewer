import { HttpClient, HttpClientRequest } from "@effect/platform";
import { Context, Data, Effect, Layer } from "effect";
import type { InferEffect } from "../../../lib/effect/types";
import type { ExtendedConversation } from "../../types";
import { parseJsonArray } from "../functions/parseJsonArray";

export class RemoteSessionFetchError extends Data.TaggedError(
  "RemoteSessionFetchError",
)<{
  url: string;
  message: string;
}> {}

export class RemoteSessionParseError extends Data.TaggedError(
  "RemoteSessionParseError",
)<{
  url: string;
  message: string;
}> {}

const LayerImpl = Effect.gen(function* () {
  const httpClient = yield* HttpClient.HttpClient;

  const fetchRemoteSession = (url: string) =>
    Effect.gen(function* () {
      const request = HttpClientRequest.get(url);

      const response = yield* httpClient.execute(request).pipe(
        Effect.mapError(
          (error) =>
            new RemoteSessionFetchError({
              url,
              message: `Failed to fetch: ${error.message}`,
            }),
        ),
      );

      const text = yield* response.text.pipe(
        Effect.mapError(
          () =>
            new RemoteSessionFetchError({
              url,
              message: "Failed to read response body",
            }),
        ),
      );

      const conversations = yield* Effect.try({
        try: () => parseJsonArray(text),
        catch: (error) =>
          new RemoteSessionParseError({
            url,
            message:
              error instanceof Error ? error.message : "Failed to parse JSON",
          }),
      });

      return conversations;
    });

  return {
    fetchRemoteSession,
  };
});

export type IRemoteSessionService = InferEffect<typeof LayerImpl>;

export class RemoteSessionService extends Context.Tag("RemoteSessionService")<
  RemoteSessionService,
  IRemoteSessionService
>() {
  static Live = Layer.effect(this, LayerImpl);
}

export type RemoteSessionResponse = {
  conversations: ExtendedConversation[];
};
