import { Injectable, effect, inject, signal } from '@angular/core';
import { Todo } from '../models/todo';
import { TodoStorageService } from './todo-storage.service';
import { NotificationService } from './notification.service';

@Injectable({ providedIn: 'root' })
export class TodoService {
  private readonly storage = inject(TodoStorageService);
  private readonly notifications = inject(NotificationService);

  private readonly todos = signal<Todo[]>([]);
  private readonly initialized = signal(false);

  readonly all = this.todos.asReadonly();

  constructor() {
    void this.restoreTodos();

    effect(() => {
      if (this.initialized()) {
        void this.storage.saveTodos(this.todos()).catch((error) =>
          console.error('Failed to persist todos', error)
        );
      }
    });
  }

  addTodo(title: string): void {
    const trimmed = title.trim();
    if (!trimmed) {
      return;
    }

    const now = Date.now();
    const todo: Todo = {
      id: this.generateId(),
      title: trimmed,
      completed: false,
      updatedAt: now
    };

    this.todos.update((current) => [todo, ...current]);
    void this.notifications
      .notify('Todo added', {
        body: `“${trimmed}” was added to your list.`,
        tag: todo.id
      })
      .catch((error) => console.error('Failed to send add notification', error));
  }

  toggleTodo(id: string, completed: boolean): void {
    this.todos.update((current) =>
      current.map((todo) =>
        todo.id === id ? { ...todo, completed, updatedAt: Date.now() } : todo
      )
    );
  }

  updateTodoTitle(id: string, title: string): void {
    const trimmed = title.trim();
    if (!trimmed) {
      this.removeTodo(id);
      return;
    }

    this.todos.update((current) =>
      current.map((todo) =>
        todo.id === id ? { ...todo, title: trimmed, updatedAt: Date.now() } : todo
      )
    );

    const updatedTodo = this.todos().find((todo) => todo.id === id);
    if (updatedTodo) {
      void this.notifications
        .notify('Todo updated', {
          body: `“${updatedTodo.title}” was updated.`,
          tag: updatedTodo.id
        })
        .catch((error) => console.error('Failed to send update notification', error));
    }
  }

  removeTodo(id: string): void {
    this.todos.update((current) => current.filter((todo) => todo.id !== id));
  }

  trackById(_: number, todo: Todo): string {
    return todo.id;
  }

  private async restoreTodos(): Promise<void> {
    try {
      const stored = await this.storage.loadTodos();
      this.todos.set(stored);
    } catch (error) {
      console.error('Failed to restore todos from storage', error);
      this.todos.set([]);
    } finally {
      this.initialized.set(true);
    }
  }

  private generateId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }

    return Math.random().toString(36).slice(2, 11);
  }
}
