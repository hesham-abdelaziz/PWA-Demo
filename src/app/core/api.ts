import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';

export interface Todo {
  id: number;
  title: string;
  done: boolean;
}
@Injectable({
  providedIn: 'root',
})
export class Api {
  private http = inject(HttpClient);

  todos = signal<Todo[]>([]);

  async loadTodos() {
    const data = await this.http.get<Todo[]>('/api/todos').toPromise();
    this.todos.set(data ?? []);
  }

  async addTodo(title: string) {
    const newTodo = await this.http.post<Todo>('/api/todos', { title }).toPromise();
    this.todos.update((todos) => [...todos, newTodo!]);
  }

  async toggleTodo(id: number, done: boolean) {
    const updatedTodo = await this.http.patch<Todo>(`/api/todos/${id}`, { done }).toPromise();
    this.todos.update((todos) => todos.map((t) => (t.id === id ? updatedTodo! : t)));
  }
}
