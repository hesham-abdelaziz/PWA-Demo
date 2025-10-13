import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import packageJson from '../../package.json';
import { UpdateService } from './update';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = signal('pwa');
  protected readonly version = packageJson.version ?? '0.0.0';
  private update = inject(UpdateService);
  constructor() {
    this.update.init();
    console.log('App constructor');
  }
}
