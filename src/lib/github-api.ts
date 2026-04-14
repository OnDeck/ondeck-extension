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

async function githubFetch(path: string, token: string): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(`${GITHUB_API_BASE}${path}`, {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
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
  | 'ci_activity'
  | 'invitation'
  | 'manual'
  | 'mention'
  | 'review_requested'
  | 'security_alert'
  | 'state_change'
  | 'subscribed'
  | 'team_mention';

export interface NotificationItem {
  id: string;
  unread: boolean;
  reason: NotificationReason | string;
  updated_at: string;
  subject: {
    title: string;
    url: string | null;
    latest_comment_url: string | null;
    type: 'PullRequest' | 'Issue' | 'Discussion' | 'Release' | 'Commit' | string;
  };
  repository: {
    id: number;
    name: string;
    full_name: string;
    html_url: string;
  };
}

export async function fetchUnreadNotifications(
  token: string,
): Promise<NotificationItem[]> {
  const res = await githubFetch('/notifications?all=false&per_page=50', token);
  const data = (await res.json()) as NotificationItem[];
  return Array.isArray(data) ? data : [];
}

export async function markNotificationRead(id: string, token: string): Promise<void> {
  const response = await fetch(`${GITHUB_API_BASE}/notifications/threads/${id}`, {
    method: 'PATCH',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (!response.ok && response.status !== 205) {
    throw new GitHubApiError(
      `Failed to mark thread ${id} as read (${response.status})`,
      response.status,
      'other',
    );
  }
}

/**
 * Convert the GitHub API subject URL (api.github.com) to a browsable html_url
 * by swapping the host and stripping the /repos prefix. Falls back to the
 * repository URL on failure.
 */
export function notificationHtmlUrl(item: NotificationItem): string {
  const subjectUrl = item.subject.url;
  if (!subjectUrl) return item.repository.html_url;
  try {
    const url = new URL(subjectUrl);
    const path = url.pathname
      .replace(/^\/repos\//, '/')
      .replace('/pulls/', '/pull/');
    return `https://github.com${path}`;
  } catch {
    return item.repository.html_url;
  }
}
