import { type Effect, LogLevel, Logger } from "effect";

export const resolveLogLevel = (verbose: boolean | undefined) =>
  verbose === true ? LogLevel.Debug : LogLevel.Info;

export const serverLoggerLayer = Logger.replace(Logger.defaultLogger, Logger.prettyLogger());

export const withServerLogLevel =
  (verbose: boolean | undefined) =>
  <A, E, R>(effect: Effect.Effect<A, E, R>) =>
    effect.pipe(Logger.withMinimumLogLevel(resolveLogLevel(verbose)));
