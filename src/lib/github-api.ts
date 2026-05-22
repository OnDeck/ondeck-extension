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

// ---------- Search (issues/PRs) ----------

export interface IssueSearchUser {
  login: string;
  avatar_url: string;
}

export interface IssueSearchLabel {
  id: number;
  name: string;
  color: string;
}

export interface IssueSearchItem {
  id: number;
  number: number;
  title: string;
  html_url: string;
  repository_url: string;
  state: 'open' | 'closed';
  draft?: boolean;
  user: IssueSearchUser;
  labels: IssueSearchLabel[];
  pull_request?: {
    url: string;
    html_url: string;
    draft?: boolean;
  };
  updated_at: string;
  created_at: string;
  body?: string | null;
}

export interface IssueSearchResult {
  total_count: number;
  incomplete_results: boolean;
  items: IssueSearchItem[];
}

const DEFAULT_SEARCH_LIMIT = 30;

async function searchIssues(
  token: string,
  query: string,
  perPage = DEFAULT_SEARCH_LIMIT,
): Promise<IssueSearchResult> {
  const params = new URLSearchParams({
    q: query,
    per_page: String(perPage),
    sort: 'updated',
    order: 'desc',
  });
  const res = await githubFetch(`/search/issues?${params.toString()}`, token);
  return (await res.json()) as IssueSearchResult;
}

export function searchAssignedPrs(token: string, login: string) {
  return searchIssues(token, `is:pr is:open assignee:${login} archived:false`);
}

export function searchReviewRequested(token: string, login: string) {
  return searchIssues(token, `is:pr is:open review-requested:${login} archived:false`);
}

export function searchMentions(token: string, login: string) {
  return searchIssues(token, `is:open mentions:${login} archived:false`);
}

/**
 * Repository full name ("owner/repo") can be derived from either
 * `repository_url` (api.github.com/repos/owner/repo) or the `html_url`.
 */
export function repoFullNameFromItem(item: IssueSearchItem): string {
  if (item.repository_url) {
    const parts = item.repository_url.split('/repos/');
    if (parts[1]) return parts[1];
  }
  try {
    const url = new URL(item.html_url);
    const segments = url.pathname.split('/').filter(Boolean);
    if (segments.length >= 2) return `${segments[0]}/${segments[1]}`;
  } catch {
    /* fall through */
  }
  return '';
}

export function isPullRequest(item: IssueSearchItem): boolean {
  return Boolean(item.pull_request);
}

export function isDraftPullRequest(item: IssueSearchItem): boolean {
  return Boolean(item.draft || item.pull_request?.draft);
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
  owner: IssueSearchUser;
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

export async function listNotifications(
  token: string,
  options: { all?: boolean } = {},
): Promise<NotificationItem[]> {
  const params = new URLSearchParams({
    all: options.all ? 'true' : 'false',
    per_page: '50',
  });
  const res = await githubFetch(`/notifications?${params.toString()}`, token);
  return (await res.json()) as NotificationItem[];
}

export async function markNotificationRead(token: string, threadId: string): Promise<void> {
  await githubFetch(`/notifications/threads/${threadId}`, token, { method: 'PATCH' });
}

/**
 * PR details returned from the GitHub API.
 * We only include fields needed to check if a PR is merged/closed.
 */
export interface PullRequestDetails {
  state: 'open' | 'closed';
  merged: boolean;
  merged_at: string | null;
}

/**
 * Fetch PR details to check if it's merged.
 * Returns null if the subject URL can't be parsed or the request fails.
 */
export async function fetchPullRequestDetails(
  token: string,
  subjectUrl: string,
): Promise<PullRequestDetails | null> {
  const match = subjectUrl.match(/\/repos\/([^/]+)\/([^/]+)\/pulls\/(\d+)/);
  if (!match) return null;

  const [, owner, repo, prNumber] = match;
  try {
    const res = await githubFetch(`/repos/${owner}/${repo}/pulls/${prNumber}`, token);
    const data = await res.json() as PullRequestDetails;
    return {
      state: data.state,
      merged: data.merged,
      merged_at: data.merged_at,
    };
  } catch {
    return null;
  }
}

/**
 * Check if a notification is for a merged PR.
 * Returns false for non-PR notifications or if the check fails.
 */
export async function isNotificationForMergedPR(
  token: string,
  notification: NotificationItem,
): Promise<boolean> {
  if (notification.subject.type !== 'PullRequest' || !notification.subject.url) {
    return false;
  }

  const details = await fetchPullRequestDetails(token, notification.subject.url);
  return details?.merged ?? false;
}

/**
 * Check if a notification is for a closed PR (merged or closed without merge).
 * Returns false for non-PR notifications or if the check fails.
 */
export async function isNotificationForClosedPR(
  token: string,
  notification: NotificationItem,
): Promise<boolean> {
  if (notification.subject.type !== 'PullRequest' || !notification.subject.url) {
    return false;
  }

  const details = await fetchPullRequestDetails(token, notification.subject.url);
  return details?.state === 'closed';
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
