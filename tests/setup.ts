// IndexedDB em memória para testes de integração com Dexie.
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';

// Banco limpo a cada teste: evita vazamento de estado entre casos.
beforeEach(() => {
  indexedDB = new IDBFactory();
});
