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
    public readonly kind: 'unauthorized' | 'forbidden' | 'network' | 'other',
  ) {
    super(message);
    this.name = 'GitHubApiError';
  }
}

async function githubFetch(
  path: string,
  token: string,
  init: RequestInit = {},
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
  if (response.status === 403) {
    throw new GitHubApiError('Forbidden — check token scopes', 403, 'forbidden');
  }
  if (!response.ok) {
    throw new GitHubApiError(
      `GitHub API error (${response.status})`,
      response.status,
      'other',
    );
  }
  return response;
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

export type NotificationSubjectType =
  | 'PullRequest'
  | 'Issue'
  | 'Discussion'
  | 'Release'
  | 'Commit'
  | 'CheckSuite'
  | string;

export type NotificationReason =
  | 'assign'
  | 'author'
  | 'comment'
  | 'mention'
  | 'review_requested'
  | 'subscribed'
  | 'team_mention'
  | 'state_change'
  | 'security_alert'
  | 'ci_activity'
  | string;

export interface NotificationItem {
  id: string;
  unread: boolean;
  reason: NotificationReason;
  updated_at: string;
  subject: {
    title: string;
    url: string | null;
    type: NotificationSubjectType;
  };
  repository: {
    id: number;
    full_name: string;
    html_url: string;
  };
}

interface RawNotification {
  id: string;
  unread: boolean;
  reason: string;
  updated_at: string;
  subject: { title: string; url: string | null; type: string };
  repository: { id: number; full_name: string; html_url: string };
}

export async function fetchNotifications(token: string): Promise<NotificationItem[]> {
  const res = await githubFetch('/notifications?all=false&per_page=50', token);
  const data = (await res.json()) as RawNotification[];
  return data.map((n) => ({
    id: n.id,
    unread: n.unread,
    reason: n.reason,
    updated_at: n.updated_at,
    subject: { title: n.subject.title, url: n.subject.url, type: n.subject.type },
    repository: {
      id: n.repository.id,
      full_name: n.repository.full_name,
      html_url: n.repository.html_url,
    },
  }));
}

export async function markNotificationRead(
  token: string,
  threadId: string,
): Promise<void> {
  await githubFetch(`/notifications/threads/${threadId}`, token, {
    method: 'PATCH',
  });
}

/**
 * Convert an api.github.com subject URL to a browser URL on github.com.
 * Notifications return API URLs like
 * https://api.github.com/repos/o/r/pulls/123 — turn that into
 * https://github.com/o/r/pull/123 so click-through opens the human page.
 */
export function notificationHref(item: NotificationItem): string {
  const url = item.subject.url;
  if (!url) return item.repository.html_url;
  const match = url.match(/repos\/([^/]+)\/([^/]+)\/(pulls|issues|releases)\/(\w+)/);
  if (match) {
    const [, owner, repo, kind, id] = match;
    const segment =
      kind === 'pulls' ? 'pull' : kind === 'issues' ? 'issues' : 'releases/tag';
    return `https://github.com/${owner}/${repo}/${segment}/${id}`;
  }
  return item.repository.html_url;
}
