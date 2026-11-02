// The backend now does three things instead of one:
//   1. Auth: log in, log out, "who am I" (server.js + auth.js + userStore.js)
//   2. Your own roadmap data: GET/PUT /api/state — same as before, but now
//      scoped to whoever is logged in (server.js + roadmapStore.js)
//   3. Admin-only: see every user's data, and create/remove user accounts

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');

const userStore = require('./userStore');
const roadmapStore = require('./roadmapStore');
const { setSessionCookie, clearSessionCookie, readSession, requireAuth, requireAdmin } = require('./auth');

const app = express();
const PORT = process.env.PORT || 4000;

// During development the client (port 5173) and server (port 4000) are
// different origins, and cookies need `credentials: true` on both sides
// to cross that boundary. In production, the client is served BY this
// same server (see the static-file section below), so this almost never
// matters there — but it's harmless to leave configured.
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));

app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());
app.use(readSession); // attaches req.user if there's a valid session cookie

app.use((req, res, next) => {
  console.log(req.method, req.url, req.user ? `(${req.user.username})` : '(anonymous)');
  next();
});

// ---------------------------------------------------------------------
// Auth routes
// ---------------------------------------------------------------------

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }
  const user = userStore.verifyPassword(username, password);
  if (!user) {
    return res.status(401).json({ error: 'Incorrect username or password.' });
  }
  setSessionCookie(res, user);
  res.json({ user });
});

app.post('/api/auth/change-password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  try {
    const user = userStore.changeOwnPassword(req.user.id, currentPassword, newPassword);
    res.json({ user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/auth/logout', (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

// Lets the React app ask "is anyone logged in right now?" when it first loads.
app.get('/api/auth/me', (req, res) => {
  res.json({ user: req.user || null });
});

// ---------------------------------------------------------------------
// Your own roadmap data — same shape as the original single-user version,
// just scoped to req.user.id now instead of one shared file.
// ---------------------------------------------------------------------

app.get('/api/state', requireAuth, (req, res) => {
  res.json(roadmapStore.readState(req.user.id));
});

app.put('/api/state', requireAuth, (req, res) => {
  const newState = req.body;
  if (!newState || !Array.isArray(newState.projects)) {
    return res.status(400).json({ error: 'Expected a JSON body with a "projects" array.' });
  }
  roadmapStore.writeState(req.user.id, newState);
  res.json(newState);
});

// ---------------------------------------------------------------------
// Admin-only routes
// ---------------------------------------------------------------------

// Every user's account info (no passwords) — for the "manage users" list.
app.get('/api/admin/users', requireAdmin, (req, res) => {
  res.json({ users: userStore.listUsers() });
});

app.post('/api/admin/users', requireAdmin, (req, res) => {
  try {
    const newUser = userStore.createUser(req.body || {});
    res.json({ user: newUser });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/admin/users/:id/reset-password', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const { newPassword } = req.body || {};
  try {
    const user = userStore.resetPassword(id, newPassword);
    res.json({ user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/admin/users/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user.id) {
    return res.status(400).json({ error: "You can't delete the account you're currently logged in as." });
  }
  const deleted = userStore.deleteUser(id);
  if (!deleted) return res.status(404).json({ error: 'No user with that id.' });
  res.json({ ok: true });
});

// Every user's roadmap data at once — this is what powers the admin
// overview screen. Each entry is one user's account info PLUS their
// projects, so the admin can see everything without logging in as them.
app.get('/api/admin/overview', requireAdmin, (req, res) => {
  const users = userStore.listUsers();
  const roadmaps = roadmapStore.readStateForUsers(users.map((u) => u.id));

  const combined = users.map((user) => {
    const match = roadmaps.find((r) => r.userId === user.id);
    return {
      id: user.id,
      username: user.username,
      isAdmin: user.isAdmin,
      projects: match ? match.data.projects : []
    };
  });

  res.json({ users: combined });
});

// ---------------------------------------------------------------------
// Serving the built React app (production) — same as before.
// ---------------------------------------------------------------------
const CLIENT_BUILD_FOLDER = path.join(__dirname, '..', 'client', 'dist');

if (fs.existsSync(CLIENT_BUILD_FOLDER)) {
  app.use(express.static(CLIENT_BUILD_FOLDER));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(CLIENT_BUILD_FOLDER, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
