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

export type NotificationReason =
  | 'assign'
  | 'author'
  | 'comment'
  | 'invitation'
  | 'manual'
  | 'mention'
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
  | 'CheckSuite';

export interface NotificationItem {
  id: string;
  unread: boolean;
  reason: NotificationReason;
  updated_at: string;
  subject: {
    title: string;
    url: string | null;
    latest_comment_url: string | null;
    type: NotificationSubjectType | string;
  };
  repository: {
    id: number;
    full_name: string;
    html_url: string;
    owner: { login: string; avatar_url: string };
  };
}

export async function fetchNotifications(
  token: string,
): Promise<NotificationItem[]> {
  const res = await githubFetch('/notifications?all=false&per_page=100', token);
  const data = (await res.json()) as NotificationItem[];
  return Array.isArray(data) ? data : [];
}

export async function markNotificationAsRead(
  token: string,
  threadId: string,
): Promise<void> {
  await githubFetch(`/notifications/threads/${threadId}`, token, {
    method: 'PATCH',
  });
}

/**
 * Convert a GitHub API subject URL into a browser-friendly URL so clicks
 * open the issue/PR/release page rather than the raw JSON.
 */
export function notificationHtmlUrl(
  notification: NotificationItem,
): string {
  const subject = notification.subject.url ?? '';
  if (!subject) return notification.repository.html_url;
  const cleaned = subject.replace(`${GITHUB_API_BASE}/repos/`, '');
  return `https://github.com/${cleaned
    .replace('/pulls/', '/pull/')
    .replace('/commits/', '/commit/')}`;
}
