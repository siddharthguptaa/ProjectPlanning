// Every call here includes `credentials: 'include'`. That's what tells
// the browser "send the session cookie along with this request" — without
// it, every request would look logged-out even right after logging in,
// because the cookie wouldn't be attached. This matters most during local
// development, where the client (port 5173) and server (port 4000) are
// different origins; in production they're the same origin and it's less
// critical, but harmless to always include it.

async function handleJsonResponse(response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || `Request failed (status ${response.status})`);
  }
  return body;
}

function get(url) {
  return fetch(url, { credentials: 'include' }).then(handleJsonResponse);
}

function post(url, data) {
  return fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(handleJsonResponse);
}

function put(url, data) {
  return fetch(url, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(handleJsonResponse);
}

function del(url) {
  return fetch(url, { method: 'DELETE', credentials: 'include' }).then(handleJsonResponse);
}

// --- Auth ---
export function login(username, password) {
  return post('/api/auth/login', { username, password }); // -> { user }
}
export function logout() {
  return post('/api/auth/logout', {}); // -> { ok: true }
}
export function fetchCurrentUser() {
  return get('/api/auth/me'); // -> { user: {...} | null }
}
export function changeOwnPassword(currentPassword, newPassword) {
  return post('/api/auth/change-password', { currentPassword, newPassword }); // -> { user }
}

// --- Your own roadmap data ---
export function fetchState() {
  return get('/api/state');
}
export function saveState(state) {
  return put('/api/state', state);
}

// --- Admin only ---
export function fetchAdminOverview() {
  return get('/api/admin/overview'); // -> { users: [{ id, username, isAdmin, projects }, ...] }
}
export function fetchUserList() {
  return get('/api/admin/users'); // -> { users: [{ id, username, isAdmin }, ...] }
}
export function createUserAccount(username, password, isAdmin) {
  return post('/api/admin/users', { username, password, isAdmin }); // -> { user }
}
export function deleteUserAccount(userId) {
  return del('/api/admin/users/' + userId); // -> { ok: true }
}
export function resetUserPassword(userId, newPassword) {
  return post('/api/admin/users/' + userId + '/reset-password', { newPassword }); // -> { user }
}
