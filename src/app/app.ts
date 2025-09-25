import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, Validators, NonNullableFormBuilder } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { TodoService } from './services/todo.service';
import { ConnectivityService } from './services/connectivity.service';
import { NotificationService } from './services/notification.service';
import { Todo } from './models/todo';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DatePipe],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly todoService = inject(TodoService);
  private readonly connectivityService = inject(ConnectivityService);
  private readonly notificationService = inject(NotificationService);

  protected readonly todos = this.todoService.all;
  protected readonly isOnline = this.connectivityService.isOnline;
  protected readonly editingId = signal<string | null>(null);

  protected readonly todoForm = this.formBuilder.group({
    title: ['', [Validators.required, Validators.maxLength(120)]]
  });

  protected readonly editControl = this.formBuilder.control('', {
    validators: [Validators.required, Validators.maxLength(120)]
  });

  protected readonly pendingCount = computed(
    () => this.todos().filter((todo) => !todo.completed).length
  );

  createTodo(): void {
    if (this.todoForm.invalid) {
      return;
    }

    const { title } = this.todoForm.getRawValue();
    this.todoService.addTodo(title);
    this.todoForm.reset({ title: '' });
  }

  beginEdit(todo: Todo): void {
    this.editingId.set(todo.id);
    this.editControl.setValue(todo.title);
  }

  commitEdit(id: string): void {
    if (this.editControl.invalid) {
      return;
    }

    this.todoService.updateTodoTitle(id, this.editControl.getRawValue());
    this.editingId.set(null);
    this.editControl.reset('');
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.editControl.reset('');
  }

  toggleTodo(id: string, completed: boolean): void {
    this.todoService.toggleTodo(id, completed);
  }

  onToggleChange(id: string, event: Event): void {
    const target = event.target as HTMLInputElement | null;
    this.toggleTodo(id, !!target?.checked);
  }

  removeTodo(id: string): void {
    this.todoService.removeTodo(id);
  }

  trackByTodo = this.todoService.trackById.bind(this.todoService);

  enableNotifications(): void {
    void this.notificationService.requestPermission();
  }
}
