import { Component, inject, PLATFORM_ID } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Api, Todo } from '../core/api';
import { isPlatformBrowser } from '@angular/common';
import { OfflineService } from '../core/offline.service';
@Component({
  selector: 'app-todos',
  imports: [FormsModule],
  template: `
    <div class="todos-page">
      <header class="hero">
        <h1>Task board</h1>
        <p>Capture your todos and keep working offline.</p>
      </header>

      <section class="status" [class.offline]="!offline.isOnline()">
        <span class="indicator" aria-hidden="true"></span>
        <div class="status-text">
          <strong>{{ offline.isOnline() ? 'Online' : 'Offline' }}</strong>
          <span>
            {{
              offline.isOnline()
                ? 'Connected to the server'
                : 'Changes are stored locally and will sync later'
            }}
          </span>
        </div>
        @if (api.pendingCount()) {
        <span class="pending">{{ api.pendingCount() }} pending</span>
        }
      </section>

      <section class="card">
        <form (ngSubmit)="add()" novalidate>
          <label class="sr-only" for="newTodo">Add todo</label>
          <input
            id="newTodo"
            type="text"
            name="title"
            [(ngModel)]="title"
            placeholder="What needs to be done?"
            autocomplete="off"
          />

          <button type="submit" [disabled]="!title.trim()">Add</button>
        </form>

        <ul class="todo-list">
          @if (api.todos().length === 0) {
          <li class="empty">Nothing here yet. Add your first todo!</li>
          } @else {
          @for (todo of api.todos(); track todo.id) {
          <li [class.completed]="todo.done">
            <label>
              <input type="checkbox" (change)="toggle(todo)" [checked]="todo.done" />
              <span>{{ todo.title }}</span>
            </label>
            @if (todo.id < 0) {
            <span class="badge">offline</span>
            }
            <button
              type="button"
              class="icon-button"
              (click)="remove(todo, $event)"
              [attr.aria-label]="'Delete ' + todo.title"
            >
              ✕
            </button>
          </li>
          }
          }
        </ul>
      </section>
    </div>
  `,
  styleUrl: './todos.scss',
})
export class Todos {
  api = inject(Api);
  platformId = inject(PLATFORM_ID);
  protected offline = inject(OfflineService);
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
    await this.api.toggleTodo(todo, !todo.done);
  }

  async remove(todo: Todo, event?: Event) {
    event?.preventDefault();
    event?.stopPropagation();
    await this.api.deleteTodo(todo);
  }
}
