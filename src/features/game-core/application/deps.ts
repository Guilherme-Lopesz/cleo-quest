import type { CatalogItem, Clock, IdGenerator, ItemId, ProgressStore } from '../contracts';
import type { EventBus } from './event-bus';

export interface Catalog {
  list(): CatalogItem[];
  get(id: ItemId | string): CatalogItem | undefined;
}

export interface CoreDeps {
  store: ProgressStore;
  bus: EventBus;
  clock: Clock;
  ids: IdGenerator;
  catalog: Catalog;
}

export const defaultIds: IdGenerator = {
  next: (prefix) =>
    `${prefix}_${typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(36).slice(2)}`}`,
};
