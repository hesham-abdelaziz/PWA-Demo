import { inject, Injectable } from '@angular/core';
import { SwUpdate, VersionReadyEvent, SwPush } from '@angular/service-worker';
import { filter } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class Update {
  private sw = inject(SwUpdate);
  private swPush = inject(SwPush);
  init() {
    if (!this.sw.isEnabled) {
      console.info('Service worker is not enabled');
      return;
    }

    this.swPush.messages.subscribe((message) => {
      console.log('Push message received: ', message);
    });

    this.swPush.notificationClicks.subscribe((notification) => {
      console.log('Notification click received: ', notification);
    });

    this.sw.versionUpdates
      .pipe(filter((e): e is VersionReadyEvent => e.type === 'VERSION_DETECTED'))
      .subscribe(async () => {
        await this.sw.activateUpdate();
        document.location.reload();
      });
  }
}
