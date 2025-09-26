import { Injectable, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, NgZone } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class OfflineService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly zone = inject(NgZone);
  readonly isBrowser = isPlatformBrowser(this.platformId);

  private registration: ServiceWorkerRegistration | undefined;
  private readonly onlineStatus = signal(this.isBrowser ? navigator.onLine : true);
  private readonly onlineCallbacks = new Set<() => void>();

  readonly isOnline = computed(() => this.onlineStatus());

  constructor() {
    if (!this.isBrowser) {
      return;
    }

    this.zone.runOutsideAngular(() => {
      window.addEventListener('online', this.handleOnlineChange);
      window.addEventListener('offline', this.handleOnlineChange);
    });

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        this.registration = reg;
      });
    }

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => void 0);
    }
  }

  onOnline(callback: () => void) {
    this.onlineCallbacks.add(callback);
  }

  private handleOnlineChange = () => {
    this.zone.run(() => {
      const online = navigator.onLine;
      const previous = this.onlineStatus();
      this.onlineStatus.set(online);

      if (online !== previous) {
        if (online) {
          this.notify('Back online', {
            body: 'Your changes will sync automatically.',
          });
          this.onlineCallbacks.forEach((cb) => cb());
        } else {
          this.notify('Offline mode', {
            body: 'You can keep working and your changes will sync later.',
          });
        }
      }
    });
  };

  async notify(title: string, options?: NotificationOptions) {
    if (!this.isBrowser || !('Notification' in window)) {
      return;
    }

    if (Notification.permission === 'default') {
      try {
        await Notification.requestPermission();
      } catch {
        // ignore
      }
    }

    if (Notification.permission !== 'granted') {
      return;
    }

    const payload: NotificationOptions = {
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
      ...options,
    };

    if (this.registration && 'showNotification' in this.registration) {
      try {
        await this.registration.showNotification(title, payload);
        return;
      } catch {
        // fall back to Notification constructor
      }
    }

    new Notification(title, payload);
  }
}
