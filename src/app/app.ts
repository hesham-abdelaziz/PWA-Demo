import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Update } from './update';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = signal('pwa');
  private update = inject(Update);
  constructor() {
    this.update.init();
  }
}
