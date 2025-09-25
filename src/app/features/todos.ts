import { Component, inject, PLATFORM_ID } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Api, Todo } from '../core/api';
import { isPlatformBrowser } from '@angular/common';
@Component({
  selector: 'app-todos',
  imports: [FormsModule],
  template: `
    <h1>Todos</h1>
    <form (ngSubmit)="add()" #f="ngForm">
      <input type="text" name="title" [(ngModel)]="title" placeholder="New todo" />

      <button type="submit">Add</button>
    </form>

    <ul>
      @for (todo of api.todos(); track todo.id) {
      <li>
        <label>
          <input type="checkbox" (change)="toggle(todo)" [checked]="todo.done" />
          {{ todo.title }}
        </label>
      </li>
      }
    </ul>
  `,
  styleUrl: './todos.scss',
})
export class Todos {
  api = inject(Api);
  platformId = inject(PLATFORM_ID);
  title = '';

  constructor() {
    if (isPlatformBrowser(this.platformId)) this.api.loadTodos();
  }
  async add() {
    const value = this.title.trim();
    if (value) {
      await this.api.addTodo(value);
      this.title = '';
    }
  }

  async toggle(todo: Todo) {
    await this.api.toggleTodo(todo.id, !todo.done);
  }
}
