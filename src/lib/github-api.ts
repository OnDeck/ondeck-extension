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

export interface GitHubSearchItem {
  id: number;
  number: number;
  title: string;
  html_url: string;
  state: string;
  draft?: boolean;
  body?: string | null;
  user: { login: string; avatar_url: string } | null;
  labels: { name: string; color?: string }[];
  updated_at: string;
  created_at: string;
  repository_url: string;
  pull_request?: { html_url: string; draft?: boolean } | null;
}

interface SearchResponse {
  total_count: number;
  items: GitHubSearchItem[];
}

interface SearchCountResponse {
  total_count: number;
}

/**
 * Run a GitHub search query and return just the total count. Uses
 * `per_page=1` so the response stays small.
 */
export async function githubSearchCount(query: string, token: string): Promise<number> {
  const path = `/search/issues?q=${encodeURIComponent(query)}&per_page=1`;
  const res = await githubFetch(path, token);
  const data = (await res.json()) as SearchCountResponse;
  return data.total_count ?? 0;
}

/**
 * Run a GitHub issues/PR search and return the raw items. `perPage` is
 * capped at 50 since the popup is space-constrained.
 */
export async function searchIssues(
  query: string,
  token: string,
  perPage = 30,
): Promise<GitHubSearchItem[]> {
  const path =
    `/search/issues?q=${encodeURIComponent(query)}` +
    `&per_page=${Math.min(perPage, 50)}&sort=updated&order=desc`;
  const res = await githubFetch(path, token);
  const data = (await res.json()) as SearchResponse;
  return data.items ?? [];
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
  | 'team_mention'
  | string;

export type NotificationSubjectType =
  | 'PullRequest'
  | 'Issue'
  | 'Discussion'
  | 'Release'
  | 'Commit'
  | 'CheckSuite'
  | string;

export interface GitHubNotification {
  id: string;
  unread: boolean;
  reason: NotificationReason;
  updated_at: string;
  subject: {
    title: string;
    url: string | null;
    latest_comment_url: string | null;
    type: NotificationSubjectType;
  };
  repository: {
    full_name: string;
    html_url: string;
  };
}

/**
 * Fetch unread notifications for the authenticated user. Capped at 50.
 */
export async function fetchNotifications(token: string): Promise<GitHubNotification[]> {
  const res = await githubFetch('/notifications?all=false&per_page=50', token);
  const data = (await res.json()) as GitHubNotification[];
  return Array.isArray(data) ? data : [];
}

/**
 * Mark a single notification thread as read.
 * `PATCH /notifications/threads/{thread_id}`.
 */
export async function markNotificationRead(threadId: string, token: string): Promise<void> {
  // githubFetch only supports GET — inline a PATCH here.
  let res: Response;
  try {
    res = await fetch(`${GITHUB_API_BASE}/notifications/threads/${threadId}`, {
      method: 'PATCH',
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
  // 205 Reset Content is the happy path; 404/410 mean the thread is gone.
  if (res.status === 205 || res.status === 200 || res.status === 404 || res.status === 410) {
    return;
  }
  if (res.status === 401) {
    throw new GitHubApiError('Token is invalid or expired', 401, 'unauthorized');
  }
  throw new GitHubApiError(`Failed to mark read (${res.status})`, res.status, 'other');
}

/**
 * Derive the github.com URL for a notification subject. GitHub's notification
 * API returns api.github.com URLs, so we have to rewrite them manually.
 */
export function notificationHtmlUrl(notif: GitHubNotification): string {
  const { subject, repository } = notif;
  if (!subject.url) return repository.html_url;
  const match = subject.url.match(
    /repos\/([^/]+)\/([^/]+)\/(issues|pulls|discussions|releases|commits)\/([^/?#]+)/,
  );
  if (!match) return repository.html_url;
  const [, owner, repo, kind, id] = match;
  const segment =
    kind === 'pulls'
      ? 'pull'
      : kind === 'issues'
      ? 'issues'
      : kind === 'discussions'
      ? 'discussions'
      : kind === 'releases'
      ? 'releases/tag'
      : 'commit';
  return `https://github.com/${owner}/${repo}/${segment}/${id}`;
}

export interface PullRequestDetail {
  number: number;
  changed_files: number;
  additions: number;
  deletions: number;
}

/**
 * Fetch the PR detail for an owner/repo/number combo. Used by the Reviews
 * tab to enrich rows with a files-changed count after the initial render.
 */
export async function fetchPullRequestDetail(
  owner: string,
  repo: string,
  number: number,
  token: string,
): Promise<PullRequestDetail> {
  const res = await githubFetch(`/repos/${owner}/${repo}/pulls/${number}`, token);
  const data = (await res.json()) as PullRequestDetail;
  return {
    number: data.number,
    changed_files: data.changed_files,
    additions: data.additions,
    deletions: data.deletions,
  };
}

/**
 * Return the number of unread notifications for the authenticated user.
 * GitHub does not expose a dedicated count endpoint, so we page through the
 * unread list (capped at 50) which is sufficient for a badge-style count.
 */
export async function githubNotificationsCount(token: string): Promise<number> {
  const res = await githubFetch('/notifications?all=false&per_page=50', token);
  const data = (await res.json()) as unknown[];
  return Array.isArray(data) ? data.length : 0;
}
