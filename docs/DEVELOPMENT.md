# Development guide

Everything you need to run, test, and build the extension locally.

## Prerequisites

| Tool | Minimum | Recommended |
|------|---------|-------------|
| Node.js | 18 | 20 LTS |
| npm | 9 | bundled with Node 20 |
| Chrome / Chromium | any MV3-capable | latest stable |

```bash
node --version   # must be 18+
npm --version    # must be 9+
```

## Setup

```bash
git clone https://github.com/Dillan-03/github-chrome.git
cd github-chrome
npm install
```

## Build

### One-shot build

```bash
npm run build
```

Runs `tsc -b` (type-check + emit) then Vite. Output goes to `dist/`.

### Watch mode (for active development)

```bash
npm run dev
```

Rebuilds `dist/` on every file save. Leave this running in a terminal while
you work — Chrome loads files directly out of `dist/`, so there is no dev
server to visit.

## Load the extension into Chrome

1. Open `chrome://extensions`.
2. Enable **Developer mode** (toggle, top-right).
3. Click **Load unpacked** → select the `dist/` folder.
4. Pin the extension from the puzzle-piece menu so the popup is one click away.

After each rebuild, click the **↻ refresh** icon on the extension card to pick
up the changes. You don't need to remove and re-add it.

## Available scripts

| Script | What it does |
|--------|-------------|
| `npm run dev` | Watch build — rebuilds `dist/` on every save |
| `npm run build` | Production build (typecheck → bundle) |
| `npm run typecheck` | TypeScript strict check, no emit |
| `npm test` | Run the Vitest suite once |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run lint` | ESLint on `src/` and `tests/` |
| `npm run format` | Prettier write on all `ts/tsx/css/json` files |

## Running tests

```bash
npm test              # single run, exit 0/1
npm run test:watch    # re-runs affected tests on save
```

Tests live in `tests/` and mirror the `src/` structure:

```
tests/
├── shared/
│   ├── notifications/
│   │   └── prioritizer.test.ts
│   └── filters/
│       └── engine.test.ts
```

## Sign in (first run)

1. Click the extension icon to open the popup.
2. Go to [github.com/settings/tokens/new](https://github.com/settings/tokens/new) and create a token with these scopes:
   - `read:user`
   - `notifications`
   - `repo` (or `public_repo` for public-only access)
3. Paste the token into the **Personal Access Token** field and click **Connect**.

Tokens are encrypted with AES-GCM before being written to `chrome.storage.sync`.

## Project layout

```
github-chrome/
├── public/
│   ├── manifest.json          # Chrome Manifest V3
│   └── icons/                 # 16 / 48 / 128 px icons
├── src/
│   ├── background/
│   │   ├── service-worker.ts  # MV3 background entry
│   │   ├── schedulers/        # Alarm-based polling setup
│   │   └── workers/           # Sync logic (fetch → cache → badge)
│   ├── lib/
│   │   ├── auth.ts            # PAT + OAuth sign-in, encrypted storage
│   │   ├── crypto.ts          # AES-GCM wrapper
│   │   └── github-api.ts      # Typed GitHub REST client
│   ├── shared/
│   │   ├── analytics/         # computeMetrics()
│   │   ├── constants/         # Alarm name, intervals, cache keys
│   │   ├── filters/           # applyFilter(), NotificationFilter type
│   │   ├── logger/            # Structured logger (silent in prod)
│   │   ├── notifications/     # prioritizer, grouper
│   │   └── utils/             # compactRelativeTime, notifDisplay
│   ├── popup/
│   │   ├── App.tsx            # Top-level shell
│   │   ├── main.tsx           # React entry
│   │   ├── index.html         # Popup HTML
│   │   ├── components/        # All UI components
│   │   └── hooks/             # useAuth, useGitHubQuery
│   └── styles/
│       └── globals.css        # OnDeck design tokens + Tailwind directives
├── tests/                     # Vitest unit tests
├── docs/                      # This file, screenshots
├── .github/workflows/ci.yml   # Lint → Typecheck → Test → Build
├── tailwind.config.js
└── vite.config.ts
```

## CI

GitHub Actions runs on every push and PR:

1. **Lint** — `npm run lint`
2. **Typecheck** — `npm run typecheck`
3. **Test** — `npm test`
4. **Build** — `npm run build`

All four steps must pass before a PR can merge.

## Troubleshooting

**Popup is blank or stuck on "Loading…"**
Open `chrome://extensions`, click **Errors** on the extension card, or click
**Inspect views → service worker** to see the background console.

**Changes aren't showing up**
Make sure `npm run dev` is running, then click the ↻ refresh icon on the
extension card. Closing and re-opening the popup alone is not enough.

**"Manifest file is missing or unreadable"**
You pointed Chrome at the wrong folder. Select `dist/`, not the repo root.

**Token errors**
- `unauthorized` — token revoked or expired; generate a new one.
- `forbidden` — token is missing a required scope; edit it at
  [github.com/settings/tokens](https://github.com/settings/tokens).
