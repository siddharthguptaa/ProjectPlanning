# Roadmap Planner — self-hosted, multi-user

A plan-vs-actual roadmap tool: projects, epics, milestones, a timeline
view, and a cross-project overview. Each person who logs in has their own
private set of projects — nobody sees anyone else's data except an admin
account, which can see everyone's.

## Structure

```
roadmap-planner/
├── server/     Express API — auth + per-user data storage
└── client/     React app (Vite) — the UI
```

## First login

The server creates a default admin account the first time it runs:

```
username: admin
password: admin123
```

**Log in with that, then immediately add your real account** (Admin →
"Manage users" → "Add user") and either delete the default admin or
change its password. Leaving `admin`/`admin123` in place on anything
reachable by other people is not safe.

## Running it locally

You'll need [Node.js](https://nodejs.org) installed (18+ recommended).

**1. Install dependencies** (once):
```bash
cd server && npm install
cd ../client && npm install
```

**2. Run both pieces** (two terminals):
```bash
# Terminal 1
cd server
npm run dev        # starts the API on http://localhost:4000

# Terminal 2
cd client
npm run dev        # starts the UI on http://localhost:5173
```

Open **http://localhost:5173** and log in with the default admin above.

## How accounts and data work

- **Logging in** gives you a session cookie (an httpOnly cookie holding a
  signed token) — the browser sends it automatically on every request
  after that, so the server always knows who's asking.
- **Your own projects**: `GET`/`PUT /api/state` always means "my own
  data." There's no way to fetch someone else's roadmap through that
  route, regardless of who you are.
- **Admin accounts** (`isAdmin: true`) get an extra "👑 Admin: everyone's
  projects" view, backed by separate `/api/admin/*` routes the server
  only allows for admin accounts. Admins can open any user's project to
  look at it ("Open →" on their overview card) — full timeline, epics,
  milestones — but it's read-only there; edits always go through each
  person's own `/api/state`, never the admin routes.
- **Adding people**: there's no public sign-up page on purpose (so random
  people can't create accounts). An admin creates each account from the
  "Manage users" panel, inside the app.
- **Changing passwords**: anyone logged in can change their own password
  ("Change password" in the header, requires their current one). Admins
  can also reset anyone's password from "Manage users" without needing
  the old one — useful for getting off the default admin account without
  losing access to that account's data (deleting and recreating the
  account would instead create a new, empty one).

## Where the data lives

```
server/data/
├── users.json                    accounts (hashed passwords, never plaintext)
├── users.backup.json             rolling backup of the above
└── roadmaps/
    ├── user-1.json                admin's own roadmap data
    ├── user-1.backup.json         rolling backup
    ├── user-2.json                the next person's roadmap data
    └── user-2.backup.json
```

Same shape as the original single-user version, just one file per person
now instead of one shared file.

## Backups

Two layers, both automatic:

1. **Roadmap data files are committed to git** (`server/data/roadmaps/user-*.json`
   — not `.gitignore`'d). Every commit carries everyone's current data with
   it. If the server ever loses its disk, pulling the repo again restores
   the data along with the code.
2. **A rolling local backup per file**: before overwriting any file (a
   user's roadmap, or `users.json`), the server first copies the current
   version to a `.backup.json` alongside it. If a file ever goes missing
   or gets corrupted, the server automatically restores from that backup
   on the next read.

**`users.json` is deliberately NOT committed to git** — even though
passwords are hashed, not plaintext, it's safer to keep account data out
of version control. It still gets the rolling local backup, just not the
git layer.

**Worth knowing if you push this to a public repo**: the roadmap data
files contain real project content — names, dates, descriptions. Fine for
a private repo; if you ever make it public, stop tracking those files
first (`git rm --cached server/data/roadmaps/*.json`, then re-add the
pattern to `.gitignore`).

## Deploying it (single server)

```bash
cd client && npm run build      # produces client/dist
cd ../server && npm start       # serves the API AND client/dist together
```

Host the `server/` folder (with `client/dist` built alongside it) wherever
you'd run any Node app. Set these environment variables for a real
deployment:

- `PORT` — defaults to 4000.
- `JWT_SECRET` — **set this to a long random string.** Without it, the
  server falls back to an insecure default (fine for local dev, not for
  anything reachable by other people) and prints a warning on startup.
- `CLIENT_ORIGIN` — only matters if the client is served from a different
  origin than the API (not the case in this single-server setup); defaults
  to `http://localhost:5173` for local development.

Make sure `server/data/` persists across deploys/restarts — some
platforms wipe the filesystem on every deploy, in which case point the
folder paths in `server/userStore.js` and `server/roadmapStore.js` at a
mounted persistent volume instead.

## Deploying via GitLab CI/CD

`.gitlab-ci.yml` is included and does three things on every push:
install both client and server dependencies (to catch a broken
`package.json` early), build the client, and leave a **manual** deploy
job that `rsync`s the project to your own server over SSH and restarts it
with `pm2`. It's manual on purpose — you click "Play" on it in GitLab's
pipeline view rather than it running automatically, since it touches a
real server.

To use the deploy job, set these under **Settings → CI/CD → Variables**
in your GitLab project:

| Variable | Example |
|---|---|
| `SSH_PRIVATE_KEY` | private key for a user that can SSH into your server |
| `DEPLOY_HOST` | `your-server.example.com` |
| `DEPLOY_USER` | `deploy` |
| `DEPLOY_PATH` | `/var/www/roadmap-planner` |

This assumes the target server already has Node.js and `pm2` installed.
GitLab itself only runs the pipeline job (a temporary container) — the
app still ends up running on *your* server, same as any other deployment
method above; GitLab Pages can't host this app on its own, since it only
serves static files and this needs a persistent backend.

## Code style notes

- **Data flow**: everything for the logged-in user's own roadmap goes
  through one `data` object (see the comment at the top of `App.jsx`).
  Every change is a functional state update —
  `saveAndSetData(prevData => nextData)` — which is what lets the action
  callbacks use `useCallback` with genuinely stable references.
- **Shared helpers**: `withUpsertedItem` (add-or-replace in an array) and
  `withUpdatedProject` (replace one project in the list) are used by
  every epic/milestone/project action instead of each repeating the logic.
- **Memoization**: `Timeline` and `Overview` do real date-math/aggregation
  work, wrapped in `useMemo`. The list components (`ProjectTabs`,
  `EpicTable`, `MilestoneTable`, `Overview`, `Timeline`, and their row
  components) are wrapped in `React.memo`.
- **A gotcha worth knowing**: `prompt()`/`confirm()` calls happen *outside*
  the `setData` updater function, not inside it — React can invoke an
  updater more than once (e.g. under StrictMode in development), which
  would otherwise pop a dialog twice. A `dataRef` gives those handlers a
  synchronous way to read the latest data for the dialog without needing
  `data` in their own dependency array.
- **Date/variance math**: lives entirely in `dateMath.js` as plain
  functions with no React in them.
- **Auth**: `auth.js` is just a cookie + JWT verify/sign, with
  `requireAuth`/`requireAdmin` as small Express middleware functions. No
  session database — the cookie itself (signed, so it can't be forged) is
  the whole session.

## Extending it

- **Swap the data layer**: `server/roadmapStore.js` and
  `server/userStore.js` are the only two files that touch the filesystem.
  Replace either with a real database without touching any route or
  client code.
- **Let admins edit another user's data, not just view it**: the admin
  overview can open any user's project (`AdminOverview.jsx`'s "view as"),
  but it's deliberately read-only — `EpicTable`/`MilestoneTable`'s
  `readOnly` prop just hides the edit/delete controls. Making it
  editable would mean letting an admin's requests target someone else's
  data; keep that deliberately separate from their own `/api/state` calls
  if you build this, so a bug can't accidentally mix the two up.
- **Logo assets**: `pptxExport.js` embeds the brand wordmark/stacked-logo
  as inline SVG strings (rasterized to PNG at export time via canvas).
  If the brand template ever changes, that's the file to update.
- **No rate-limiting on login**: nothing currently stops repeated
  password guesses against `/api/auth/login`. Fine on a private network;
  worth adding (e.g. `express-rate-limit`) before exposing this publicly.
- **No automated tests**: `dateMath.js` in particular is pure functions
  with no UI — the easiest file in the project to actually unit test,
  and currently nothing does.

## Where things are

- `server/userStore.js` — accounts: create/list/delete, password checks
- `server/roadmapStore.js` — one user's roadmap data: read/write, per user
- `server/auth.js` — session cookie signing/verifying, auth middleware
- `server/server.js` — all the routes, wiring the above together
- `client/src/dateMath.js` — all the date/working-day/variance math
- `client/src/App.jsx` — top-level data and every add/edit/delete action
- `client/src/components/Login.jsx` — the login screen
- `client/src/components/AdminOverview.jsx` — admin-only, everyone's projects
- `client/src/excelExport.js` / `excelImport.js` — Excel export/import
- `client/src/pptxExport.js` — the full Motherson-branded PowerPoint export
- `client/src/components/` — one file per other piece of UI
