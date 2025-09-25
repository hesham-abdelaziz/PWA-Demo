require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

const app = express();

const PORT = process.env.PORT || 3000;
// Angular v17+ default: dist/<project-name>/browser
const DIST_FOLDER = path.join(__dirname, '..', 'dist', 'pwa', 'browser');

// --- Security & basics ---
app.use(helmet({ contentSecurityPolicy: false })); // keep simple while developing
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(compression());
app.use(morgan('dev'));

// --- Demo API routes (define BEFORE static/fallback) ---
let todos = [
  { id: 1, title: 'Install PWA', done: true },
  { id: 2, title: 'Wire Node Server', done: false },
];

app.get('/api/todos', (_req, res) => res.json(todos));

app.post('/api/todos', (req, res) => {
  const { title, done = false } = req.body || {};
  if (!title) return res.status(400).json({ message: 'title is required' });
  const id = todos.length ? Math.max(...todos.map((t) => t.id)) + 1 : 1;
  const newTodo = { id, title, done: Boolean(done) };
  todos.push(newTodo);
  res.status(201).json(newTodo);
});

app.patch('/api/todos/:id', (req, res) => {
  const id = Number(req.params.id);
  const todo = todos.find((t) => t.id === id);
  if (!todo) return res.status(404).json({ message: 'todo not found' });
  const { title, done } = req.body || {};
  if (title !== undefined) todo.title = title;
  if (done !== undefined) todo.done = Boolean(done);
  res.json(todo);
});

app.delete('/api/todos/:id', (req, res) => {
  const id = Number(req.params.id);
  const before = todos.length;
  todos = todos.filter((t) => t.id !== id);
  if (before === todos.length) return res.status(404).json({ message: 'todo not found' });
  res.status(204).end();
});

// --- Static assets ---
// Give long cache for hashed assets; avoid caching for index.html & SW files
app.use((req, res, next) => {
  const url = req.url;

  // No-cache for PWA critical files that control updates
  if (
    url === '/index.html' ||
    url === '/ngsw.json' ||
    url.startsWith('/ngsw-worker') ||
    url.startsWith('/safety-worker')
  ) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  } else if (/\.[a-f0-9]{8,}\.(?:js|css|png|jpg|jpeg|webp|gif|svg|woff2?)$/i.test(url)) {
    // Hashed assets -> immutable
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  }
  next();
});

app.use(
  express.static(DIST_FOLDER, {
    index: false, // we’ll serve index.html ourselves in the fallback
    etag: false,
  })
);

app.get(/^\/(?!api\/).*/, (_req, res) => {
  res.sendFile(path.join(DIST_FOLDER, 'index.html'));
});

// --- Error handler (optional but handy in dev) ---
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`✅ Server listening on http://localhost:${PORT}`);
  console.log(`📁 Serving: ${DIST_FOLDER}`);
});
