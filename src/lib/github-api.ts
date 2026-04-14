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
  if (!response.ok && response.status !== 304) {
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

// ---------- Search / issues ----------

export interface IssueAuthor {
  login: string;
  avatar_url: string;
  html_url: string;
}

export interface IssueLabel {
  id: number;
  name: string;
  color: string;
}

export interface IssueResult {
  id: number;
  number: number;
  title: string;
  html_url: string;
  repository_url: string;
  state: 'open' | 'closed';
  draft?: boolean;
  pull_request?: { html_url: string; merged_at: string | null; draft?: boolean } | null;
  user: IssueAuthor;
  labels: IssueLabel[];
  comments: number;
  body: string | null;
  created_at: string;
  updated_at: string;
}

export interface SearchIssuesResponse {
  total_count: number;
  incomplete_results: boolean;
  items: IssueResult[];
}

export async function searchIssues(
  token: string,
  query: string,
  opts: { perPage?: number; page?: number; sort?: string; order?: 'asc' | 'desc' } = {},
): Promise<SearchIssuesResponse> {
  const params = new URLSearchParams();
  params.set('q', query);
  params.set('per_page', String(opts.perPage ?? 30));
  if (opts.page) params.set('page', String(opts.page));
  if (opts.sort) params.set('sort', opts.sort);
  if (opts.order) params.set('order', opts.order);
  const res = await githubFetch(`/search/issues?${params.toString()}`, token);
  return (await res.json()) as SearchIssuesResponse;
}

export async function searchIssuesCount(token: string, query: string): Promise<number> {
  const res = await searchIssues(token, query, { perPage: 1 });
  return res.total_count;
}

// ---------- Notifications ----------

export interface NotificationSubject {
  title: string;
  url: string | null;
  latest_comment_url: string | null;
  type: 'PullRequest' | 'Issue' | 'Discussion' | 'Release' | 'Commit' | string;
}

export interface NotificationRepository {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  owner: { login: string; avatar_url: string };
}

export interface NotificationThread {
  id: string;
  unread: boolean;
  reason: string;
  updated_at: string;
  last_read_at: string | null;
  subject: NotificationSubject;
  repository: NotificationRepository;
}

export async function fetchNotifications(
  token: string,
  opts: { all?: boolean; participating?: boolean; perPage?: number } = {},
): Promise<NotificationThread[]> {
  const params = new URLSearchParams();
  params.set('all', String(opts.all ?? false));
  if (opts.participating) params.set('participating', 'true');
  params.set('per_page', String(opts.perPage ?? 50));
  const res = await githubFetch(`/notifications?${params.toString()}`, token);
  return (await res.json()) as NotificationThread[];
}

export async function markNotificationRead(token: string, threadId: string): Promise<void> {
  await githubFetch(`/notifications/threads/${threadId}`, token, { method: 'PATCH' });
}

// ---------- Helpers used by views ----------

export function repoFromIssue(issue: IssueResult): string {
  // repository_url looks like https://api.github.com/repos/{owner}/{repo}
  const match = issue.repository_url.match(/repos\/([^/]+\/[^/]+)/);
  return match?.[1] ?? '';
}

export function issueIsPullRequest(issue: IssueResult): boolean {
  return Boolean(issue.pull_request);
}

const RELATIVE_UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 60 * 60 * 24 * 365],
  ['month', 60 * 60 * 24 * 30],
  ['week', 60 * 60 * 24 * 7],
  ['day', 60 * 60 * 24],
  ['hour', 60 * 60],
  ['minute', 60],
  ['second', 1],
];

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diffSec = (then - Date.now()) / 1000;
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  for (const [unit, seconds] of RELATIVE_UNITS) {
    if (Math.abs(diffSec) >= seconds || unit === 'second') {
      return formatter.format(Math.round(diffSec / seconds), unit);
    }
  }
  return '';
}

// ---------- Aggregated counts for dashboard ----------

export interface DashboardCounts {
  assignedPrs: number;
  reviewRequests: number;
  mentions: number;
  unreadNotifications: number;
}

export async function fetchDashboardCounts(
  token: string,
  login: string,
): Promise<DashboardCounts> {
  const [assigned, reviews, mentions, notifications] = await Promise.all([
    searchIssuesCount(token, `is:pr assignee:${login} is:open`),
    searchIssuesCount(token, `is:pr review-requested:${login} is:open`),
    searchIssuesCount(token, `mentions:${login} is:open`),
    fetchNotifications(token, { all: false, perPage: 50 }),
  ]);
  return {
    assignedPrs: assigned,
    reviewRequests: reviews,
    mentions,
    unreadNotifications: notifications.length,
  };
}
