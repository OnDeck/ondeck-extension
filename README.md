# github-chrome

A lightweight Chrome extension that gives developers an at-a-glance view of
their GitHub workflow — assigned PRs, mentions, reviews, and notifications —
without leaving their current browser context.

## Tech stack

- Vite + React 18 + TypeScript
- Tailwind CSS v3 with GitHub Primer color tokens
- Chrome Manifest V3 (service worker background, popup UI)

## Project layout

```
github-chrome/
├── public/
│   ├── manifest.json      # Manifest V3
│   └── icons/             # 16 / 48 / 128 px extension icons
├── src/
│   ├── popup/             # React popup entry (index.html + App.tsx)
│   ├── background/        # Service worker entry
│   ├── lib/               # Shared helpers (GitHub API client, auth)
│   └── styles/            # Tailwind globals
├── tailwind.config.js
├── vite.config.ts
└── package.json
```

## Local development

```bash
npm install
npm run dev        # watch build → dist/
# or
npm run build      # one-shot production build
```

### Authentication

The popup supports two sign-in paths:

1. **Personal Access Token (default).** Create a token at
   [github.com/settings/tokens/new](https://github.com/settings/tokens/new) with
   scopes `read:user`, `notifications`, and `repo`, then paste it into the
   popup's sign-in screen. Tokens are encrypted with AES-GCM (key stored in
   `chrome.storage.local`) before being written to `chrome.storage.sync`.

2. **GitHub OAuth (optional).** Register an OAuth app and set the redirect URI
   to the value returned by `chrome.identity.getRedirectURL('oauth2')`. GitHub's
   OAuth flow requires a server-side token exchange (the client secret cannot
   ship in an extension), so you also need a small endpoint that takes
   `{ code, state, redirect_uri }` and returns `{ access_token }`. Provide both
   values at build time:

   ```bash
   VITE_GITHUB_OAUTH_CLIENT_ID=Iv1.xxxxxxxxxxxxxxxx \
   VITE_GITHUB_OAUTH_EXCHANGE_URL=https://your.exchange/api/github \
   npm run build
   ```

   When either env var is missing the OAuth button is hidden and the popup
   falls back to PAT-only sign-in.

### Load the unpacked extension in Chrome

1. Run `npm run build` (or `npm run dev` for watch mode).
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select the `dist/` folder.
5. Pin the "GitHub Workflow Assistant" extension from the toolbar puzzle menu.

Re-run `npm run build` (or keep `npm run dev` running) after changes, then hit
the refresh icon on the extension card in `chrome://extensions`.

## Roadmap

Tracked as GitHub issues in this repo, labeled `[Feature]`. Phase 1 (MVP)
covers scaffold, auth, dashboard, assigned PRs, and mentions.
