import type { BrowserContext } from '@playwright/test';

export interface FakeNotification {
  id: string;
  unread: boolean;
  reason: string;
  updated_at: string;
  last_read_at: null;
  subject: { title: string; url: string | null; latest_comment_url: null; type: string };
  repository: { id: number; name: string; full_name: string; owner: { login: string; avatar_url: string } };
}

export type GitHubMode = 'ok' | 'rate-limited' | 'expired';

export interface GitHubMock {
  notifications: FakeNotification[];
  mode: GitHubMode;
  /** "METHOD /path?query" for every API call, in order. */
  calls: string[];
}

const ROWS: Array<[string, string, string, string, boolean]> = [
  ['acme/web', 'PullRequest', 'review_requested', 'Checkout: retry payment intents on 409', true],
  ['acme/api', 'Issue', 'mention', 'Rate limiter drops requests during deploys', true],
  ['acme/design-system', 'PullRequest', 'assign', 'Add Combobox keyboard navigation', true],
  ['acme/api', 'CheckSuite', 'ci_activity', 'CI failed on main', true],
  ['acme/mobile', 'Release', 'subscribed', 'v4.2.0', false],
  ['acme/web', 'Discussion', 'team_mention', 'RFC: feature flag naming conventions', true],
];

export function fakeNotifications(): FakeNotification[] {
  const now = Date.now();
  return ROWS.map(([repo, type, reason, title, unread], i) => ({
    id: String(100 + i),
    unread,
    reason,
    updated_at: new Date(now - i * 45 * 60_000).toISOString(),
    last_read_at: null,
    subject: {
      title,
      type,
      latest_comment_url: null,
      url:
        type === 'PullRequest'
          ? `https://api.github.com/repos/${repo}/pulls/${10 + i}`
          : type === 'Issue'
            ? `https://api.github.com/repos/${repo}/issues/${10 + i}`
            : null,
    },
    repository: { id: i, name: repo.split('/')[1], full_name: repo, owner: { login: 'acme', avatar_url: '' } },
  }));
}

/** Route every api.github.com call (popup and service worker) to an in-memory fake. */
export async function mockGitHub(context: BrowserContext): Promise<GitHubMock> {
  const mock: GitHubMock = { notifications: fakeNotifications(), mode: 'ok', calls: [] };

  await context.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());
  await context.route('https://avatars.githubusercontent.com/**', (route) =>
    route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg"/>' }),
  );
  await context.route('https://api.github.com/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    mock.calls.push(`${method} ${url.pathname}${url.search}`);

    if (mock.mode === 'rate-limited') {
      const reset = String(Math.floor(Date.now() / 1000) + 600);
      return route.fulfill({ status: 403, headers: { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': reset }, body: '{}' });
    }
    if (mock.mode === 'expired') return route.fulfill({ status: 401, body: '{}' });

    if (url.pathname === '/user') {
      return route.fulfill({
        json: { login: 'e2e-user', id: 1, name: 'E2E', avatar_url: 'https://avatars.githubusercontent.com/u/1', html_url: 'https://github.com/e2e-user' },
      });
    }
    if (url.pathname === '/notifications' && method === 'GET') {
      const all = url.searchParams.get('all') === 'true';
      return route.fulfill({ json: all ? mock.notifications : mock.notifications.filter((n) => n.unread) });
    }
    if (url.pathname === '/notifications' && method === 'PUT') {
      mock.notifications.forEach((n) => (n.unread = false));
      return route.fulfill({ status: 205, body: '' });
    }
    const thread = url.pathname.match(/^\/notifications\/threads\/(\w+)$/);
    if (thread && method === 'PATCH') {
      const n = mock.notifications.find((x) => x.id === thread[1]);
      if (n) n.unread = false;
      return route.fulfill({ status: 205, body: '' });
    }
    return route.fulfill({ status: 404, body: '{}' });
  });

  return mock;
}
