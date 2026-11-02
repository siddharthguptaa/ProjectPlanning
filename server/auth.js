// Handles "is this request logged in, and as who" using a signed cookie
// (a JWT) instead of a server-side session store — simpler to run (no
// extra database/session table needed), at the cost of not being able to
// instantly revoke a single session before it expires. Fine for a small
// self-hosted tool.

const jwt = require('jsonwebtoken');

// IMPORTANT: set a real JWT_SECRET environment variable before deploying
// this anywhere other people can reach. This fallback only exists so the
// app runs out of the box for local development.
const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret-change-me';
if (!process.env.JWT_SECRET) {
  console.warn('JWT_SECRET is not set — using an insecure default. Set a real one (a long random string) before deploying.');
}

const COOKIE_NAME = 'roadmap_session';
const TOKEN_LIFETIME = '30d';

// Creates the signed token for a user and sets it as an httpOnly cookie
// (so client-side JavaScript can't read it — only the browser sends it
// back automatically on each request).
function setSessionCookie(res, user) {
  const token = jwt.sign(
    { id: user.id, username: user.username, isAdmin: user.isAdmin },
    JWT_SECRET,
    { expiresIn: TOKEN_LIFETIME }
  );
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days, in milliseconds
    // Add `secure: true` here once this is served over HTTPS in production.
  });
}

function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME);
}

// Runs on every request. If there's a valid session cookie, attaches
// `req.user` (with id/username/isAdmin). If not, just leaves req.user
// undefined and moves on — this middleware never rejects a request by
// itself; requireAuth/requireAdmin below do that for the routes that need it.
function readSession(req, res, next) {
  const token = req.cookies[COOKIE_NAME];
  if (token) {
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      // Expired or tampered token — treat the same as "not logged in."
    }
  }
  next();
}

function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'You need to be logged in.' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'You need to be logged in.' });
  }
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  next();
}

module.exports = { setSessionCookie, clearSessionCookie, readSession, requireAuth, requireAdmin };
