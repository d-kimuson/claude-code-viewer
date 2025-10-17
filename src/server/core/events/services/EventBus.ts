import { Context, Effect, Layer } from "effect";
import type { InternalEventDeclaration } from "../types/InternalEventDeclaration";

type Listener<T> = (data: T) => void | Promise<void>;

interface EventBusService {
  readonly emit: <EventName extends keyof InternalEventDeclaration>(
    event: EventName,
    data: InternalEventDeclaration[EventName],
  ) => Effect.Effect<void>;
  readonly on: <EventName extends keyof InternalEventDeclaration>(
    event: EventName,
    listener: Listener<InternalEventDeclaration[EventName]>,
  ) => Effect.Effect<void>;
  readonly off: <EventName extends keyof InternalEventDeclaration>(
    event: EventName,
    listener: Listener<InternalEventDeclaration[EventName]>,
  ) => Effect.Effect<void>;
}

export class EventBus extends Context.Tag("EventBus")<
  EventBus,
  EventBusService
>() {
  static Live = Layer.effect(
    this,
    Effect.gen(function* () {
      const listenersMap = new Map<
        keyof InternalEventDeclaration,
        Set<Listener<unknown>>
      >();

      const getListeners = <EventName extends keyof InternalEventDeclaration>(
        event: EventName,
      ): Set<Listener<InternalEventDeclaration[EventName]>> => {
        if (!listenersMap.has(event)) {
          listenersMap.set(event, new Set());
        }
        return listenersMap.get(event) as Set<
          Listener<InternalEventDeclaration[EventName]>
        >;
      };

      const emit = <EventName extends keyof InternalEventDeclaration>(
        event: EventName,
        data: InternalEventDeclaration[EventName],
      ): Effect.Effect<void> =>
        Effect.gen(function* () {
          const listeners = getListeners(event);

          void Promise.allSettled(
            Array.from(listeners).map(async (listener) => {
              await listener(data);
            }),
          );
        });

      const on = <EventName extends keyof InternalEventDeclaration>(
        event: EventName,
        listener: Listener<InternalEventDeclaration[EventName]>,
      ): Effect.Effect<void> =>
        Effect.sync(() => {
          const listeners = getListeners(event);
          listeners.add(listener);
        });

      const off = <EventName extends keyof InternalEventDeclaration>(
        event: EventName,
        listener: Listener<InternalEventDeclaration[EventName]>,
      ): Effect.Effect<void> =>
        Effect.sync(() => {
          const listeners = getListeners(event);
          listeners.delete(listener);
        });

      return {
        emit,
        on,
        off,
      } satisfies EventBusService;
    }),
  );
}
