import type { DomainEvent, DomainEventType, EventOf } from '../contracts';

export type Listener<T extends DomainEventType> = (event: EventOf<T>) => void;
export type Unsubscribe = () => void;

/**
 * Event Bus tipado (SAD §10.2): listeners não quebram o fluxo de domínio,
 * não há duplicatas, e eventos só são publicados após persistência.
 */
export class EventBus {
  private readonly listeners = new Map<DomainEventType | '*', Set<(e: DomainEvent) => void>>();

  on<T extends DomainEventType>(type: T, listener: Listener<T>): Unsubscribe {
    const set = this.listeners.get(type) ?? new Set();
    set.add(listener as (e: DomainEvent) => void);
    this.listeners.set(type, set);
    return () => set.delete(listener as (e: DomainEvent) => void);
  }

  onAny(listener: (e: DomainEvent) => void): Unsubscribe {
    const set = this.listeners.get('*') ?? new Set();
    set.add(listener);
    this.listeners.set('*', set);
    return () => set.delete(listener);
  }

  publish(event: DomainEvent): void {
    const targets = [...(this.listeners.get(event.type) ?? []), ...(this.listeners.get('*') ?? [])];
    for (const l of targets) {
      try {
        l(event);
      } catch (e) {
        console.error('[event-bus] listener falhou', event.type, e);
      }
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}
