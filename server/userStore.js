// Manages user ACCOUNTS (who can log in) as a separate concern from the
// roadmap DATA (projects/epics/milestones) in roadmapStore.js. Stored in
// its own file, server/data/users.json, so accounts and roadmap content
// don't get tangled together.

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DATA_FOLDER = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_FOLDER, 'users.json');
const USERS_BACKUP_FILE = path.join(DATA_FOLDER, 'users.backup.json');

// Note: unlike the roadmap data files, users.json is NOT committed to
// git (see .gitignore) — it holds login credentials (hashed, but still).
// It gets the same rolling local backup as everything else, just not the
// "committed to git" layer.

// If there's no users.json yet (first run), create one with a single
// admin account so there's always a way to log in. The console warning
// is deliberately loud — this password is meant to be changed immediately.
function ensureUsersFile() {
  if (!fs.existsSync(DATA_FOLDER)) {
    fs.mkdirSync(DATA_FOLDER, { recursive: true });
  }
  if (!fs.existsSync(USERS_FILE)) {
    const defaultAdmin = {
      id: 1,
      username: 'admin',
      passwordHash: bcrypt.hashSync('admin123', 10),
      isAdmin: true
    };
    writeUsers({ users: [defaultAdmin], nextUserId: 2 });
    console.warn('--------------------------------------------------------');
    console.warn('No users.json found — created a default admin account:');
    console.warn('  username: admin');
    console.warn('  password: admin123');
    console.warn('Log in and create your real account, then delete or');
    console.warn('change this one. Do not leave this as-is in production.');
    console.warn('--------------------------------------------------------');
  }
}

function readUsers() {
  ensureUsersFile();
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  } catch (err) {
    if (fs.existsSync(USERS_BACKUP_FILE)) {
      console.warn('users.json was unreadable — restoring from users.backup.json');
      const restored = JSON.parse(fs.readFileSync(USERS_BACKUP_FILE, 'utf8'));
      writeUsers(restored);
      return restored;
    }
    throw err;
  }
}

function writeUsers(data) {
  if (fs.existsSync(USERS_FILE)) {
    fs.copyFileSync(USERS_FILE, USERS_BACKUP_FILE);
  }
  fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// Removes the password hash before handing a user object back to a route
// — nothing outside this file should ever see passwordHash.
function toSafeUser(user) {
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

function findUserByUsername(username) {
  const user = readUsers().users.find((u) => u.username.toLowerCase() === username.toLowerCase());
  return user || null;
}

function findUserById(id) {
  const user = readUsers().users.find((u) => u.id === id);
  return user ? toSafeUser(user) : null;
}

function listUsers() {
  return readUsers().users.map(toSafeUser);
}

function createUser({ username, password, isAdmin }) {
  if (!username || !username.trim()) throw new Error('Username is required.');
  if (!password || password.length < 4) throw new Error('Password must be at least 4 characters.');

  const data = readUsers();
  const alreadyExists = data.users.some((u) => u.username.toLowerCase() === username.trim().toLowerCase());
  if (alreadyExists) throw new Error('A user with that username already exists.');

  const newUser = {
    id: data.nextUserId,
    username: username.trim(),
    passwordHash: bcrypt.hashSync(password, 10),
    isAdmin: Boolean(isAdmin)
  };
  data.users.push(newUser);
  data.nextUserId += 1;
  writeUsers(data);
  return toSafeUser(newUser);
}

function deleteUser(id) {
  const data = readUsers();
  const remaining = data.users.filter((u) => u.id !== id);
  if (remaining.length === data.users.length) return false; // nothing matched
  data.users = remaining;
  writeUsers(data);
  return true;
}

// Checks a username/password pair. Returns the safe user object if it's
// correct, or null if the username doesn't exist or the password is wrong
// — deliberately the same "null" for both, so a login failure never
// reveals whether the username itself was valid.
function verifyPassword(username, password) {
  const user = findUserByUsername(username);
  if (!user) return null;
  const isCorrect = bcrypt.compareSync(password, user.passwordHash);
  return isCorrect ? toSafeUser(user) : null;
}

// Self-service: a user changing their OWN password. Requires the current
// password as proof — this is what closes the original gap where there
// was no way to get off the default admin/admin123 account at all.
function changeOwnPassword(userId, currentPassword, newPassword) {
  if (!newPassword || newPassword.length < 4) {
    throw new Error('New password must be at least 4 characters.');
  }
  const data = readUsers();
  const user = data.users.find((u) => u.id === userId);
  if (!user) throw new Error('User not found.');

  const currentIsCorrect = bcrypt.compareSync(currentPassword || '', user.passwordHash);
  if (!currentIsCorrect) throw new Error('Current password is incorrect.');

  user.passwordHash = bcrypt.hashSync(newPassword, 10);
  writeUsers(data);
  return toSafeUser(user);
}

// Admin-only: reset ANY user's password without knowing the old one —
// e.g. if someone's locked out, or to retire the default admin account's
// password without losing that account's id (and therefore its data file).
function resetPassword(userId, newPassword) {
  if (!newPassword || newPassword.length < 4) {
    throw new Error('New password must be at least 4 characters.');
  }
  const data = readUsers();
  const user = data.users.find((u) => u.id === userId);
  if (!user) throw new Error('User not found.');

  user.passwordHash = bcrypt.hashSync(newPassword, 10);
  writeUsers(data);
  return toSafeUser(user);
}

module.exports = {
  findUserByUsername, findUserById, listUsers, createUser, deleteUser,
  verifyPassword, changeOwnPassword, resetPassword
};
