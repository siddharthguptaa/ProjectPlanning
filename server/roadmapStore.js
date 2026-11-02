// Same idea as the original single-user store, just scoped per user now:
// each person's projects/epics/milestones live in their own file,
// server/data/roadmaps/user-<id>.json, completely separate from everyone
// else's. See userStore.js for the separate concern of who's allowed to
// log in.
//
// Same two backup layers as before, just applied per user:
//   1. The main file (user-<id>.json) is committed to git.
//   2. A rolling backup (user-<id>.backup.json) is kept on every write.

const fs = require('fs');
const path = require('path');

const DATA_FOLDER = path.join(__dirname, 'data');
const ROADMAPS_FOLDER = path.join(DATA_FOLDER, 'roadmaps');

function mainFile(userId) {
  return path.join(ROADMAPS_FOLDER, `user-${userId}.json`);
}
function backupFile(userId) {
  return path.join(ROADMAPS_FOLDER, `user-${userId}.backup.json`);
}

// What a brand-new user's roadmap starts out as.
function startingData() {
  return {
    projects: [
      { id: 1, name: 'Product Roadmap', epics: [], milestones: [] }
    ],
    activeId: 1,
    nextProjectId: 2,
    nextEpicId: 1,
    nextMilestoneId: 1
  };
}

function tryReadJsonFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.error(`Could not read ${filePath}: ${err.message}`);
    return null;
  }
}

// Reads one user's roadmap data — their own file first, then their
// backup, then a fresh starting point if neither exists (a brand-new user).
function readState(userId) {
  if (!fs.existsSync(ROADMAPS_FOLDER)) {
    fs.mkdirSync(ROADMAPS_FOLDER, { recursive: true });
  }

  const fromMainFile = tryReadJsonFile(mainFile(userId));
  if (fromMainFile) return fromMainFile;

  const fromBackup = tryReadJsonFile(backupFile(userId));
  if (fromBackup) {
    console.warn(`user-${userId}.json was missing/unreadable — restored from its backup.`);
    writeState(userId, fromBackup);
    return fromBackup;
  }

  return writeState(userId, startingData());
}

// Saves one user's roadmap data, backing up their previous version first.
function writeState(userId, state) {
  const file = mainFile(userId);
  if (fs.existsSync(file)) {
    fs.copyFileSync(file, backupFile(userId));
  }
  fs.writeFileSync(file, JSON.stringify(state, null, 2), 'utf8');
  return state;
}

// Used by the admin overview: reads every given user's roadmap data at
// once, so the admin page can show everyone's projects without each
// person needing to be "logged in" to see their own data.
function readStateForUsers(userIds) {
  return userIds.map((userId) => ({ userId, data: readState(userId) }));
}

module.exports = { readState, writeState, readStateForUsers };
