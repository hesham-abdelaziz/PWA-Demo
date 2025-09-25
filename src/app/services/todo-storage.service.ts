import { Injectable } from '@angular/core';
import { openDB, type IDBPDatabase } from 'idb';
import type { Todo } from '../models/todo';

const DATABASE_NAME = 'todo-store';
const STORE_NAME = 'data';
const TODOS_KEY = 'todos';

@Injectable({ providedIn: 'root' })
export class TodoStorageService {
  private dbPromise: Promise<IDBPDatabase> | null = null;
  private readonly supportsIndexedDb = typeof indexedDB !== 'undefined';
  private inMemoryCache: Todo[] = [];

  async loadTodos(): Promise<Todo[]> {
    if (!this.supportsIndexedDb) {
      return this.inMemoryCache;
    }

    const db = await this.getDatabase();
    const stored = await db.get(STORE_NAME, TODOS_KEY);
    return Array.isArray(stored) ? stored : [];
  }

  async saveTodos(todos: Todo[]): Promise<void> {
    if (!this.supportsIndexedDb) {
      this.inMemoryCache = todos;
      return;
    }

    const db = await this.getDatabase();
    await db.put(STORE_NAME, todos, TODOS_KEY);
  }

  private getDatabase(): Promise<IDBPDatabase> {
    if (!this.supportsIndexedDb) {
      return Promise.reject(new Error('IndexedDB is not supported in this environment.'));
    }

    if (!this.dbPromise) {
      this.dbPromise = openDB(DATABASE_NAME, 1, {
        upgrade(database) {
          if (!database.objectStoreNames.contains(STORE_NAME)) {
            database.createObjectStore(STORE_NAME);
          }
        }
      });
    }

    return this.dbPromise;
  }
}
