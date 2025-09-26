# Offline Service

The OfflineService centralizes browser connectivity and user notifications. It exposes reactive helpers so Angular features can respond to network changes and surface messaging through the Service Worker when available.

## Runtime Behavior
- Detects browser execution via PLATFORM_ID and skips setup when running on the server.
- Mirrors navigator.onLine inside a signal so UI components can react to connectivity changes without manual event wiring.
- Wires global online and offline listeners outside Angular's zone to avoid unnecessary change detection work.
- Captures the active ServiceWorkerRegistration to show notifications through showNotification when possible.
- Requests notification permission the first time the service boots if the user has not decided yet.

## Public API
- isBrowser: boolean flag that indicates whether window APIs are safe to use.
- isOnline: computed signal reflecting the current online status.
- onOnline(callback): registers a callback that runs whenever connectivity is restored.
- notify(title, options?): displays a notification using either the Service Worker registration or the Notification constructor.

## Connectivity Lifecycle
1. The constructor attaches online and offline listeners and stores the Service Worker registration for later use.
2. When a change occurs, handleOnlineChange updates the signal within NgZone so subscribers are notified.
3. Going offline triggers a notification telling the user that changes will sync later.
4. Coming back online triggers a notification and runs every callback that was registered via onOnline.

## Notification Handling
- Default icon and badge assets at /icons/icon-192x192.png and /icons/icon-96x96.png are merged with caller options.
- Permission requests are wrapped in try/catch to avoid unhandled promise rejections on strict browsers.
- If showNotification fails or the registration is missing, the service falls back to new Notification.

## Usage Guidelines
- Guard browser-only logic in consuming code with offlineService.isBrowser when SSR is involved.
- Register synchronization hooks once, typically during component initialization, using offlineService.onOnline.
- Await offlineService.notify if follow-up logic depends on the notification dispatch.
- When extending the service, keep direct window or document access behind the existing isBrowser checks to preserve stability during pre-rendering.
