import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private permission: NotificationPermission | null = this.initialPermission();

  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isNotificationSupported()) {
      return 'denied';
    }

    if (!this.permission || this.permission === 'default') {
      this.permission = await Notification.requestPermission();
    }

    return this.permission;
  }

  async notify(title: string, options?: NotificationOptions): Promise<void> {
    if (!this.isNotificationSupported()) {
      return;
    }

    const permission = await this.requestPermission();
    if (permission !== 'granted') {
      return;
    }

    try {
      const registration = await navigator.serviceWorker?.ready;
      if (registration) {
        await registration.showNotification(title, options);
        return;
      }
    } catch (error) {
      console.error('Unable to use service worker for notification', error);
    }

    // Fallback to direct notification if service worker registration is unavailable
    new Notification(title, options);
  }

  private isNotificationSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  private initialPermission(): NotificationPermission | null {
    if (!this.isNotificationSupported()) {
      return null;
    }

    return Notification.permission;
  }
}
