import { DestroyRef, Injectable, NgZone, computed, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent, merge, of } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class ConnectivityService {
  private readonly online = signal<boolean>(this.getInitialStatus());

  readonly isOnline = computed(() => this.online());

  constructor(private readonly zone: NgZone, private readonly destroyRef: DestroyRef) {
    if (typeof window === 'undefined') {
      return;
    }

    merge(
      of(this.getInitialStatus()),
      fromEvent(window, 'online', { passive: true }).pipe(map(() => true)),
      fromEvent(window, 'offline', { passive: true }).pipe(map(() => false))
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((status) => this.updateStatus(status));
  }

  private updateStatus(status: boolean): void {
    this.zone.run(() => this.online.set(status));
  }

  private getInitialStatus(): boolean {
    if (typeof navigator === 'undefined') {
      return true;
    }

    return navigator.onLine;
  }
}
