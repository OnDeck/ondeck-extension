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

// ---------- Notifications ----------

export type NotificationReason =
  | 'assign'
  | 'author'
  | 'comment'
  | 'ci_activity'
  | 'invitation'
  | 'manual'
  | 'member_feature_requested'
  | 'mention'
  | 'review_requested'
  | 'security_alert'
  | 'security_advisory_credit'
  | 'state_change'
  | 'subscribed'
  | 'team_mention'
  | string;

export interface NotificationThread {
  id: string;
  unread: boolean;
  reason: NotificationReason;
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
    owner: { login: string; avatar_url: string };
  };
}

export async function fetchUnreadNotifications(
  token: string,
): Promise<NotificationThread[]> {
  const res = await githubFetch('/notifications?all=false&per_page=50', token);
  const data = (await res.json()) as NotificationThread[];
  return Array.isArray(data) ? data : [];
}

export async function markNotificationRead(id: string, token: string): Promise<void> {
  // PATCH /notifications/threads/:thread_id marks the thread as read.
  const response = await fetch(`${GITHUB_API_BASE}/notifications/threads/${id}`, {
    method: 'PATCH',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (response.status === 401) {
    throw new GitHubApiError('Token is invalid or expired', 401, 'unauthorized');
  }
  if (response.status === 403) {
    throw new GitHubApiError('Forbidden — check token scopes', 403, 'forbidden');
  }
  // 205 Reset Content is the documented success status.
  if (!response.ok && response.status !== 205) {
    throw new GitHubApiError(
      `Failed to mark thread read (${response.status})`,
      response.status,
      'other',
    );
  }
}

/**
 * Converts a GitHub API subject.url into a browser-facing html_url. The
 * API returns api.github.com paths; the UI wants https://github.com paths.
 * Returns null if the subject has no URL (e.g. unreachable Discussions).
 */
export function notificationHtmlUrl(thread: NotificationThread): string | null {
  const url = thread.subject.url;
  if (!url) return thread.repository.html_url;
  // https://api.github.com/repos/owner/repo/issues/123
  //   -> https://github.com/owner/repo/issues/123
  // https://api.github.com/repos/owner/repo/pulls/123
  //   -> https://github.com/owner/repo/pull/123
  const replaced = url
    .replace('https://api.github.com/repos/', 'https://github.com/')
    .replace('/pulls/', '/pull/');
  return replaced;
}
