import { HttpClient } from '@angular/common/http';
import { inject, Injectable, computed, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { OfflineService } from './offline.service';

export interface Todo {
  id: number;
  title: string;
  done: boolean;
}

type PendingAction =
  | { type: 'add'; tempId: number; title: string; done: boolean }
  | { type: 'toggle'; id: number; done: boolean };

const TODOS_CACHE_KEY = 'pwa-demo.todos';
const QUEUE_CACHE_KEY = 'pwa-demo.queue';

@Injectable({
  providedIn: 'root',
})
export class Api {
  private http = inject(HttpClient);
  private offline = inject(OfflineService);

  todos = signal<Todo[]>([]);
  readonly pendingCount = computed(() => this.pendingActions().length);

  private readonly pendingActions = signal<PendingAction[]>([]);
  private syncing = false;

  constructor() {
    this.restoreFromStorage();
    this.offline.onOnline(() => this.syncPending());
  }

  async loadTodos() {
    if (!this.offline.isBrowser) {
      return;
    }

    if (!this.offline.isOnline()) {
      this.todos.set(this.todos());
      return;
    }

    try {
      const data = await firstValueFrom(this.http.get<Todo[]>('/api/todos'));
      if (data) {
        this.todos.set(data);
        this.persistTodos();
      }
    } catch (error) {
      console.error('Failed to load todos', error);
    } finally {
      this.syncPending();
    }
  }

  async addTodo(title: string): Promise<Todo | undefined> {
    const trimmed = title.trim();
    if (!trimmed) {
      return;
    }

    if (!this.offline.isOnline()) {
      const tempId = -Date.now();
      const offlineTodo: Todo = { id: tempId, title: trimmed, done: false };
      this.todos.update((todos) => [...todos, offlineTodo]);
      this.persistTodos();
      this.queueAction({ type: 'add', tempId, title: trimmed, done: false });
      this.offline.notify('Saved offline', {
        body: 'New todo will sync when you are back online.',
      });
      return offlineTodo;
    }

    try {
      const created = await this.createRemoteTodo(trimmed);
      if (created) {
        this.todos.update((todos) => [...todos, created]);
        this.persistTodos();
      }
      return created;
    } catch (error) {
      console.error('Failed to create todo', error);
    }

    return undefined;
  }

  async toggleTodo(todo: Todo, done: boolean): Promise<Todo | undefined> {
    const updated: Todo = { ...todo, done };
    this.todos.update((todos) => todos.map((t) => (t.id === todo.id ? updated : t)));
    this.persistTodos();

    if (!this.offline.isOnline()) {
      if (todo.id < 0) {
        this.queueAction({ type: 'add', tempId: todo.id, title: todo.title, done });
      } else {
        this.queueAction({ type: 'toggle', id: todo.id, done });
      }
      this.offline.notify('Saved offline', {
        body: 'Changes will sync once you are online.',
      });
      return updated;
    }

    try {
      const serverTodo = await this.updateRemoteTodo(todo.id, done);
      if (serverTodo) {
        this.todos.update((todos) => todos.map((t) => (t.id === todo.id ? serverTodo : t)));
        this.persistTodos();
      }
      return serverTodo;
    } catch (error) {
      console.error('Failed to update todo', error);
    }

    return undefined;
  }

  private async createRemoteTodo(title: string) {
    return firstValueFrom(this.http.post<Todo>('/api/todos', { title }));
  }

  private async updateRemoteTodo(id: number, done: boolean) {
    return firstValueFrom(this.http.patch<Todo>(`/api/todos/${id}`, { done }));
  }

  private restoreFromStorage() {
    if (!this.offline.isBrowser) {
      return;
    }

    try {
      const savedTodos = localStorage.getItem(TODOS_CACHE_KEY);
      if (savedTodos) {
        this.todos.set(JSON.parse(savedTodos));
      }

      const queue = localStorage.getItem(QUEUE_CACHE_KEY);
      if (queue) {
        this.pendingActions.set(JSON.parse(queue));
      }
    } catch (error) {
      console.error('Failed to restore cached data', error);
    }
  }

  private persistTodos() {
    if (!this.offline.isBrowser) {
      return;
    }
    try {
      localStorage.setItem(TODOS_CACHE_KEY, JSON.stringify(this.todos()));
    } catch (error) {
      console.error('Failed to persist todos', error);
    }
  }

  private persistQueue() {
    if (!this.offline.isBrowser) {
      return;
    }
    try {
      localStorage.setItem(QUEUE_CACHE_KEY, JSON.stringify(this.pendingActions()));
    } catch (error) {
      console.error('Failed to persist queue', error);
    }
  }

  private queueAction(action: PendingAction) {
    const current = [...this.pendingActions()];
    if (action.type === 'toggle') {
      const existingIndex = current.findIndex((item) => item.type === 'toggle' && item.id === action.id);
      if (existingIndex >= 0) {
        current[existingIndex] = action;
      } else {
        current.push(action);
      }
    } else {
      const existingIndex = current.findIndex((item) => item.type === 'add' && item.tempId === action.tempId);
      if (existingIndex >= 0) {
        current[existingIndex] = action;
      } else {
        current.push(action);
      }
    }

    this.pendingActions.set(current);
    this.persistQueue();
  }

  private replaceTodo(oldId: number, todo: Todo) {
    this.todos.update((todos) => todos.map((t) => (t.id === oldId ? todo : t)));
    this.persistTodos();
  }

  private async syncPending() {
    if (this.syncing || !this.offline.isOnline() || this.pendingActions().length === 0) {
      return;
    }

    this.syncing = true;

    try {
      const queue = [...this.pendingActions()];
      const remaining: PendingAction[] = [];

      for (let i = 0; i < queue.length; i++) {
        const action = queue[i];
        try {
          if (action.type === 'add') {
            let synced = await this.createRemoteTodo(action.title);
            if (synced && action.done !== synced.done) {
              synced = await this.updateRemoteTodo(synced.id, action.done);
            }
            if (synced) {
              this.replaceTodo(action.tempId, synced);
            }
          } else {
            const synced = await this.updateRemoteTodo(action.id, action.done);
            if (synced) {
              this.replaceTodo(action.id, synced);
            }
          }
        } catch (error) {
          console.error('Failed to sync action', action, error);
          remaining.push(action, ...queue.slice(i + 1));
          break;
        }
      }

      this.pendingActions.set(remaining);
      if (remaining.length === 0) {
        this.offline.notify('Changes synced', {
          body: 'Your offline changes were saved to the server.',
        });
      }
    } finally {
      this.persistQueue();
      this.syncing = false;
    }
  }
}
