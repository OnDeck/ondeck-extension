import { logger } from '../shared/logger';

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
): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(`${GITHUB_API_BASE}${path}`, {
      ...init,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        ...(init.headers ?? {}),
      },
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
  options: { all?: boolean; since?: string } = {},
): Promise<NotificationItem[]> {
  const params = new URLSearchParams({
    all: options.all ? 'true' : 'false',
    per_page: '100',
  });

  // Add 'since' parameter to fetch notifications updated after a specific date
  if (options.since) {
    params.append('since', options.since);
  }

  const allNotifications: NotificationItem[] = [];
  let url: string | null = `/notifications?${params.toString()}`;
  let pageCount = 0;
  const maxPages = 10; // Safety limit to prevent infinite loops

  while (url && pageCount < maxPages) {
    pageCount++;
    const res = await githubFetch(url, token);
    const notifications = (await res.json()) as NotificationItem[];
    allNotifications.push(...notifications);

    logger.debug({
      module: 'github-api',
      message: `Fetched notifications page ${pageCount}`,
      context: {
        count: notifications.length,
        newest: notifications[0]?.updated_at,
        oldest: notifications[notifications.length - 1]?.updated_at,
      },
    });

    // Check for next page in Link header
    const linkHeader = res.headers.get('link');
    if (linkHeader) {
      const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
      if (nextMatch) {
        // Extract path from full URL (remove base URL)
        const nextUrl = nextMatch[1];
        url = nextUrl.replace(GITHUB_API_BASE, '');
      } else {
        url = null;
      }
    } else {
      url = null;
    }
  }

  logger.debug({
    module: 'github-api',
    message: `Total notifications fetched: ${allNotifications.length}`,
    context: {
      newest: allNotifications[0]?.updated_at,
      oldest: allNotifications[allNotifications.length - 1]?.updated_at,
    },
  });

  return allNotifications;
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
 * Issue details returned from the GitHub API.
 */
export interface IssueDetails {
  state: 'open' | 'closed';
  closed_at: string | null;
}

/**
 * Fetch issue details to check if it's closed.
 * Returns null if the subject URL can't be parsed or the request fails.
 */
export async function fetchIssueDetails(
  token: string,
  subjectUrl: string,
): Promise<IssueDetails | null> {
  const match = subjectUrl.match(/\/repos\/([^/]+)\/([^/]+)\/issues\/(\d+)/);
  if (!match) return null;

  const [, owner, repo, issueNumber] = match;
  try {
    const res = await githubFetch(`/repos/${owner}/${repo}/issues/${issueNumber}`, token);
    const data = await res.json() as IssueDetails;
    return {
      state: data.state,
      closed_at: data.closed_at,
    };
  } catch {
    return null;
  }
}

/**
 * Check if a notification is for a closed issue.
 * Returns false for non-issue notifications or if the check fails.
 */
export async function isNotificationForClosedIssue(
  token: string,
  notification: NotificationItem,
): Promise<boolean> {
  if (notification.subject.type !== 'Issue' || !notification.subject.url) {
    return false;
  }

  const details = await fetchIssueDetails(token, notification.subject.url);
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
