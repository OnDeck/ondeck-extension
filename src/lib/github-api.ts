
export const GITHUB_API_BASE = 'https://api.github.com';

export interface Viewer {
  login: string;
  id: number;
  name: string | null;
  avatar_url: string;
  html_url: string;
}

export class GitHubApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly kind: 'unauthorized' | 'forbidden' | 'rate_limited' | 'network' | 'other',
  ) {
    super(message);
    this.name = 'GitHubApiError';
  }
}

async function githubFetch(
  path: string,
  token: string,
  init: RequestInit = {},
  { allowNotModified = false }: { allowNotModified?: boolean } = {},
): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(`${GITHUB_API_BASE}${path}`, {
      ...init,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(init.headers ?? {}),
      },
      // Bypass the browser's HTTP cache so a conditional request's 304 reaches
      // us as-is instead of being swapped for a stale cached 200.
      cache: 'no-store',
    });
  } catch (err) {
    throw new GitHubApiError(
      err instanceof Error ? err.message : 'Network error',
      0,
      'network',
    );
  }
  if (response.status === 401) {
    throw new GitHubApiError('Token is invalid or expired', 401, 'unauthorized');
  }
  // GitHub signals both primary and secondary rate limits with 403 (sometimes
  // 429), so check the headers before treating a 403 as a scope problem.
  const retryAfter = rateLimitRetrySeconds(response);
  if (retryAfter !== null) {
    const minutes = Math.max(1, Math.ceil(retryAfter / 60));
    throw new GitHubApiError(
      `GitHub rate limit reached. Try again in ${minutes} min.`,
      response.status,
      'rate_limited',
    );
  }
  if (response.status === 403) {
    throw new GitHubApiError('Forbidden — check token scopes', 403, 'forbidden');
  }
  if (response.status === 304 && allowNotModified) return response;
  if (!response.ok) {
    throw new GitHubApiError(
      `GitHub API error (${response.status})`,
      response.status,
      'other',
    );
  }
  return response;
}

function rateLimitRetrySeconds(response: Response): number | null {
  if (response.status !== 403 && response.status !== 429) return null;
  const retryAfter = Number(response.headers.get('retry-after'));
  if (retryAfter > 0) return retryAfter;
  if (response.headers.get('x-ratelimit-remaining') !== '0') {
    return response.status === 429 ? 60 : null;
  }
  const resetAt = Number(response.headers.get('x-ratelimit-reset'));
  return resetAt > 0 ? Math.max(0, resetAt - Date.now() / 1000) : 60;
}

export async function fetchViewer(token: string): Promise<Viewer> {
  const res = await githubFetch('/user', token);
  const data = (await res.json()) as Viewer;
  return {
    login: data.login,
    id: data.id,
    name: data.name,
    avatar_url: data.avatar_url,
    html_url: data.html_url,
  };
}

// ---------- Notifications ----------

export type NotificationReason =
  | 'assign'
  | 'author'
  | 'comment'
  | 'ci_activity'
  | 'invitation'
  | 'manual'
  | 'mention'
  | 'push'
  | 'review_requested'
  | 'security_alert'
  | 'state_change'
  | 'subscribed'
  | 'team_mention';

export type NotificationSubjectType =
  | 'PullRequest'
  | 'Issue'
  | 'Discussion'
  | 'Release'
  | 'Commit'
  | 'CheckSuite'
  | string;

export interface NotificationRepository {
  id: number;
  name: string;
  full_name: string;
  owner: { login: string; avatar_url: string };
}

export interface NotificationSubject {
  title: string;
  url: string | null;
  latest_comment_url: string | null;
  type: NotificationSubjectType;
}

export interface NotificationItem {
  id: string;
  unread: boolean;
  reason: NotificationReason;
  updated_at: string;
  last_read_at: string | null;
  subject: NotificationSubject;
  repository: NotificationRepository;
}

export type NotificationPoll =
  | { notModified: true; pollIntervalSeconds: number | null }
  | {
      notModified: false;
      items: NotificationItem[];
      lastModified: string | null;
      pollIntervalSeconds: number | null;
    };

const MAX_NOTIFICATION_PAGES = 10;

function nextPagePath(res: Response): string | null {
  const nextMatch = res.headers.get('link')?.match(/<([^>]+)>;\s*rel="next"/);
  return nextMatch ? nextMatch[1].replace(GITHUB_API_BASE, '') : null;
}

/**
 * Fetch the unread notifications (up to 10 pages). With `ifModifiedSince`
 * (a previous response's Last-Modified), GitHub answers 304 when nothing has
 * changed; those responses don't count against the rate limit.
 * `pollIntervalSeconds` is GitHub's X-Poll-Interval: don't poll more often.
 */
export async function pollNotifications(
  token: string,
  options: { since?: string; ifModifiedSince?: string } = {},
): Promise<NotificationPoll> {
  const params = new URLSearchParams({ all: 'false', per_page: '100' });
  if (options.since) params.append('since', options.since);

  const first = await githubFetch(
    `/notifications?${params.toString()}`,
    token,
    options.ifModifiedSince ? { headers: { 'If-Modified-Since': options.ifModifiedSince } } : {},
    { allowNotModified: true },
  );
  const pollHeader = Number(first.headers.get('x-poll-interval'));
  const pollIntervalSeconds = pollHeader > 0 ? pollHeader : null;
  if (first.status === 304) return { notModified: true, pollIntervalSeconds };

  const items = (await first.json()) as NotificationItem[];
  let path = nextPagePath(first);
  for (let page = 1; path && page < MAX_NOTIFICATION_PAGES; page++) {
    const res = await githubFetch(path, token);
    items.push(...((await res.json()) as NotificationItem[]));
    path = nextPagePath(res);
  }

  return { notModified: false, items, lastModified: first.headers.get('last-modified'), pollIntervalSeconds };
}

export interface NotificationsPage {
  items: NotificationItem[];
  /** Relative path of the next page (e.g. "/notifications?page=2"), or null. */
  nextUrl: string | null;
}

/**
 * Fetch a single page of notifications and expose the `rel="next"` cursor from
 * the Link header. Pass `pageUrl` (a value previously returned as `nextUrl`) to
 * fetch the following page. Lets callers paginate lazily instead of pulling the
 * whole list up front.
 */
export async function listNotificationsPage(
  token: string,
  options: { all?: boolean; since?: string; pageUrl?: string } = {},
): Promise<NotificationsPage> {
  let url = options.pageUrl;
  if (!url) {
    const params = new URLSearchParams({
      all: options.all ? 'true' : 'false',
      per_page: '100',
    });
    if (options.since) params.append('since', options.since);
    url = `/notifications?${params.toString()}`;
  }

  const res = await githubFetch(url, token);
  const items = (await res.json()) as NotificationItem[];

  let nextUrl: string | null = null;
  const linkHeader = res.headers.get('link');
  if (linkHeader) {
    const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
    if (nextMatch) nextUrl = nextMatch[1].replace(GITHUB_API_BASE, '');
  }

  return { items, nextUrl };
}

export async function markNotificationRead(token: string, threadId: string): Promise<void> {
  await githubFetch(`/notifications/threads/${threadId}`, token, { method: 'PATCH' });
}

/** Marks every notification updated at or before `lastReadAt` as read (202/205). */
export async function markAllNotificationsRead(token: string, lastReadAt: string): Promise<void> {
  await githubFetch('/notifications', token, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ last_read_at: lastReadAt, read: true }),
  });
}

/** Repo-scoped version of `markAllNotificationsRead`; `repoFullName` is "owner/repo". */
export async function markRepoNotificationsRead(
  token: string,
  repoFullName: string,
  lastReadAt: string,
): Promise<void> {
  await githubFetch(`/repos/${repoFullName}/notifications`, token, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ last_read_at: lastReadAt }),
  });
}

/**
 * Resolve a `notifications.subject.url` (api.github.com form) to a browsable
 * github.com URL. Falls back to the repository URL if the subject URL is null
 * or can't be parsed (e.g. CheckSuite notifications).
 */
export function notificationHtmlUrl(item: NotificationItem): string {
  const repoUrl = `https://github.com/${item.repository.full_name}`;
  const subjectUrl = item.subject.url;
  if (!subjectUrl) return repoUrl;
  const match = subjectUrl.match(/\/repos\/([^/]+)\/([^/]+)\/(pulls|issues)\/(\d+)/);
  if (match) {
    const [, owner, repo, kind, num] = match;
    const pathKind = kind === 'pulls' ? 'pull' : 'issues';
    return `https://github.com/${owner}/${repo}/${pathKind}/${num}`;
  }
  return repoUrl;
}
