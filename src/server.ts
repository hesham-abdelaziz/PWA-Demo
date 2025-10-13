import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

app.use(express.json());

type Todo = {
  id: number;
  title: string;
  done: boolean;
};

let todos: Todo[] = [
  { id: 1, title: 'Install PWA', done: true },
  { id: 2, title: 'Wire Node Server', done: false },
];

/**
 * Minimal in-memory API used by the demo app. The dev server defines the same
 * routes; we mirror them here so the production bundle answers /api requests.
 */
app.get('/api/todos', (_req, res) => {
  return res.json(todos);
});

app.post('/api/todos', (req, res) => {
  const { title, done = false } = req.body ?? {};
  if (!title || typeof title !== 'string') {
    return res.status(400).json({ message: 'title is required' });
  }

  const id = todos.length ? Math.max(...todos.map((todo) => todo.id)) + 1 : 1;
  const newTodo: Todo = { id, title: title.trim(), done: Boolean(done) };
  todos = [...todos, newTodo];
  return res.status(201).json(newTodo);
});

app.patch('/api/todos/:id', (req, res) => {
  const id = Number(req.params['id']);
  const todo = todos.find((item) => item.id === id);
  if (!todo) {
    return res.status(404).json({ message: 'todo not found' });
  }

  const { title, done } = req.body ?? {};
  if (title !== undefined) {
    if (!title || typeof title !== 'string') {
      return res.status(400).json({ message: 'title must be a non-empty string' });
    }
    todo.title = title.trim();
  }

  if (done !== undefined) {
    todo.done = Boolean(done);
  }

  return res.json(todo);
});

app.delete('/api/todos/:id', (req, res) => {
  const id = Number(req.params['id']);
  const next = todos.filter((item) => item.id !== id);
  if (next.length === todos.length) {
    return res.status(404).json({ message: 'todo not found' });
  }

  todos = next;
  return res.status(204).end();
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url)) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
