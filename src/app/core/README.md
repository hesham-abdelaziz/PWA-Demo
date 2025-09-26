# Core API Service

This service wraps the todo REST endpoints and exposes an offline-friendly interface for Angular components. It keeps a synchronized signal of todos, queues mutations while offline, and reconciles them once connectivity returns.

## Key Responsibilities
- Load todos from /api/todos, caching the list in localStorage.
- Create, toggle, and delete todos while surfacing success and error notifications via OfflineService.
- Queue add, toggle, and delete actions when offline and replay them in order after network access is restored.
- Persist the pending queue alongside the todo list so that state survives full page reloads.

## Public API
- todos: signal of the current todo list.
- pendingCount: computed signal exposing the number of queued mutations.
- loadTodos(): fetch the latest todos and kick off a sync pass.
- addTodo(title): create a todo immediately if online or enqueue when offline.
- toggleTodo(todo, done): update completion state locally and remotely when possible.
- deleteTodo(todo): remove a todo and ensure the server is eventually updated.

## Offline Flow Summary
1. Mutations update the local todos signal instantly.
2. When offline, actions are stored in the pending queue and the user receives a notification.
3. Once OfflineService detects connectivity, syncPending() replays queued actions against the API.
4. Successful syncs update both the todos signal and the cached storage entries.

## Usage Notes
- Always call loadTodos() during feature initialization to hydrate the local cache.
- Consumers can watch pendingCount to display sync indicators or badges.
- If you extend the service with new actions, ensure they are persisted in and restored from the queue.
