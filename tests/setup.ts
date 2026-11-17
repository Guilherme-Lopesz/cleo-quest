// IndexedDB em memória para testes de integração com Dexie.
import 'fake-indexeddb/auto';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import Dexie from 'dexie';

// Banco limpo a cada teste: evita vazamento de estado entre casos.
beforeEach(() => {
  const factory = new IDBFactory();
  Object.defineProperty(globalThis, 'indexedDB', {
    value: factory,
    configurable: true,
    writable: true,
  });
  Dexie.dependencies.indexedDB = factory;
  Dexie.dependencies.IDBKeyRange = IDBKeyRange;
});
