import { Effect } from "effect";
import type { Context, Input } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { HonoContext } from "../../hono/app";

export type ControllerResponse = {
  status: ContentfulStatusCode;
  response: object;
};

declare const dummyCtx: Context<HonoContext, string, Input>;
const dummyJson = <S extends ContentfulStatusCode, T extends object>(
  s: S,
  t: T,
) => dummyCtx.json(t, s);
type ResponseType<
  S extends ContentfulStatusCode,
  T extends object,
> = ReturnType<typeof dummyJson<S, T>>;

export const effectToResponse = async <
  const P extends string,
  const I extends Input,
  const CR extends ControllerResponse,
  const E,
  Ret = CR extends infer I
    ? I extends { status: infer S; response: infer T }
      ? S extends ContentfulStatusCode
        ? T extends object
          ? ResponseType<S, T>
          : never
        : never
      : never
    : never,
>(
  ctx: Context<HonoContext, P, I>,
  effect: Effect.Effect<CR, E, never>,
) => {
  const result = await Effect.runPromise(effect);
  const result2 = ctx.json(result.response, result.status);

  return result2 as Ret;
};
