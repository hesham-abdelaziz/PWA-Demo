import { inject, Injectable } from '@angular/core';
import { SwUpdate, SwPush, VersionEvent, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class UpdateService {
  private sw = inject(SwUpdate, { optional: true });
  private swPush = inject(SwPush, { optional: true });

  async init() {
    if (!this.sw?.isEnabled) {
      console.info('Service worker is not enabled');
      return;
    }

    // Listen BEFORE checks so we don't miss emissions
    this.sw.versionUpdates.subscribe((e: VersionEvent) => {
      switch (e.type) {
        case 'VERSION_DETECTED':
          console.log('New version detected. Downloading…', e.version);
          break;
        case 'VERSION_READY':
          console.log('New version ready:', (e as VersionReadyEvent).latestVersion);
          // Choose ONE strategy:

          // A) Prompt the user (recommended UX)
          if (confirm('A new version is available. Reload now?')) {
            this.activateAndReload();
          }

          // B) Or force auto-reload with no prompt:
          // this.activateAndReload();
          break;
        case 'NO_NEW_VERSION_DETECTED':
          console.log('No new version.');
          break;
        case 'VERSION_INSTALLATION_FAILED':
          console.warn('SW installation failed.');
          break;
      }
    });

    try {
      await this.sw.checkForUpdate();
    } catch (error) {
      console.error('Service worker update check failed', error);
    }

    // Push (only meaningful if Web Push is configured)
    if (this.swPush?.isEnabled) {
      this.swPush.messages.subscribe((msg) => console.log('Push message:', msg));
      this.swPush.notificationClicks.subscribe((click) => console.log('Notification click:', click));
    }
  }

  private async activateAndReload() {
    try {
      if (!this.sw) {
        return;
      }

      await this.sw.activateUpdate();
      location.reload();
    } catch (err) {
      console.error('activateUpdate failed', err);
    }
  }
}
