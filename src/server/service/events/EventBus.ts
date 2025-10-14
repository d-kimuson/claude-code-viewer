import { EventEmitter } from "node:stream";
import type { InternalEventDeclaration } from "./InternalEventDeclaration";

class EventBus {
  private emitter: EventEmitter;

  constructor() {
    this.emitter = new EventEmitter();
  }

  public emit<EventName extends keyof InternalEventDeclaration>(
    event: EventName,
    data: InternalEventDeclaration[EventName]
  ): void {
    this.emitter.emit(event, {
      ...data,
    });
  }

  public on<EventName extends keyof InternalEventDeclaration>(
    event: EventName,
    listener: (
      data: InternalEventDeclaration[EventName]
    ) => void | Promise<void>
  ): void {
    this.emitter.on(event, listener);
  }

  public off<EventName extends keyof InternalEventDeclaration>(
    event: EventName,
    listener: (
      data: InternalEventDeclaration[EventName]
    ) => void | Promise<void>
  ): void {
    this.emitter.off(event, listener);
  }
}

// singleton
let eventBus: EventBus | null = null;

export const getEventBus = () => {
  eventBus ??= new EventBus();
  return eventBus;
};

export type IEventBus = ReturnType<typeof getEventBus>;
