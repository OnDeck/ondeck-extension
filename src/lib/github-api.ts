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

interface GithubFetchOptions {
  method?: string;
  accept?: string;
  body?: unknown;
}

export async function githubFetch(
  path: string,
  token: string,
  options: GithubFetchOptions = {},
): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(`${GITHUB_API_BASE}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        Accept: options.accept ?? 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
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

export interface DashboardCounts {
  assignedPrs: number;
  reviewRequests: number;
  mentions: number;
  notifications: number;
}

interface SearchIssuesResponse {
  total_count: number;
}

async function fetchSearchCount(token: string, query: string): Promise<number> {
  const res = await githubFetch(
    `/search/issues?q=${encodeURIComponent(query)}&per_page=1`,
    token,
  );
  const data = (await res.json()) as SearchIssuesResponse;
  return data.total_count ?? 0;
}

export async function fetchAssignedPrCount(token: string, login: string): Promise<number> {
  return fetchSearchCount(token, `is:pr is:open assignee:${login}`);
}

export async function fetchReviewRequestCount(token: string, login: string): Promise<number> {
  return fetchSearchCount(token, `is:pr is:open review-requested:${login}`);
}

export async function fetchMentionCount(token: string, login: string): Promise<number> {
  return fetchSearchCount(token, `is:open mentions:${login}`);
}

export async function fetchNotificationCount(token: string): Promise<number> {
  const res = await githubFetch('/notifications?all=false&per_page=50', token);
  const data = (await res.json()) as unknown[];
  return Array.isArray(data) ? data.length : 0;
}

export type NotificationSubjectType =
  | 'PullRequest'
  | 'Issue'
  | 'Discussion'
  | 'Release'
  | 'Commit'
  | string;

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
  | 'state_change'
  | 'subscribed'
  | 'team_mention'
  | string;

export interface NotificationSubject {
  title: string;
  url: string | null;
  latest_comment_url: string | null;
  type: NotificationSubjectType;
}

export interface NotificationRepository {
  id: number;
  full_name: string;
  name: string;
  owner: { login: string; avatar_url: string };
  html_url: string;
}

export interface GithubNotification {
  id: string;
  unread: boolean;
  reason: NotificationReason;
  updated_at: string;
  last_read_at: string | null;
  subject: NotificationSubject;
  repository: NotificationRepository;
}

export async function fetchNotifications(
  token: string,
  options: { all?: boolean; perPage?: number } = {},
): Promise<GithubNotification[]> {
  const params = new URLSearchParams();
  params.set('all', String(options.all ?? false));
  params.set('per_page', String(options.perPage ?? 50));
  const res = await githubFetch(`/notifications?${params.toString()}`, token);
  const data = (await res.json()) as GithubNotification[];
  return Array.isArray(data) ? data : [];
}

export async function markNotificationRead(
  token: string,
  threadId: string,
): Promise<void> {
  await githubFetch(`/notifications/threads/${threadId}`, token, {
    method: 'PATCH',
  });
}

export type ReactionContent =
  | '+1'
  | '-1'
  | 'laugh'
  | 'confused'
  | 'heart'
  | 'hooray'
  | 'rocket'
  | 'eyes';

export async function addIssueReaction(
  token: string,
  owner: string,
  repo: string,
  issueNumber: number,
  content: ReactionContent,
): Promise<void> {
  await githubFetch(`/repos/${owner}/${repo}/issues/${issueNumber}/reactions`, token, {
    method: 'POST',
    accept: 'application/vnd.github+json',
    body: { content },
  });
}

export async function createIssueComment(
  token: string,
  owner: string,
  repo: string,
  issueNumber: number,
  body: string,
): Promise<void> {
  await githubFetch(`/repos/${owner}/${repo}/issues/${issueNumber}/comments`, token, {
    method: 'POST',
    body: { body },
  });
}

/**
 * Convert a GitHub API url (e.g. /repos/x/y/issues/123) into a web URL.
 */
export function apiUrlToHtmlUrl(apiUrl: string | null | undefined): string | null {
  if (!apiUrl) return null;
  return apiUrl
    .replace('https://api.github.com/repos', 'https://github.com')
    .replace('/pulls/', '/pull/');
}

export interface IssueSearchItem {
  id: number;
  number: number;
  title: string;
  html_url: string;
  repository_url: string;
  user: { login: string; avatar_url: string } | null;
  state: 'open' | 'closed';
  draft?: boolean;
  updated_at: string;
  created_at: string;
  labels: { name: string }[];
  pull_request?: { url: string };
  body?: string | null;
}

export interface IssueSearchResponse {
  total_count: number;
  incomplete_results: boolean;
  items: IssueSearchItem[];
}

export async function searchIssues(
  token: string,
  query: string,
  options: { perPage?: number; sort?: 'updated' | 'created'; order?: 'asc' | 'desc' } = {},
): Promise<IssueSearchResponse> {
  const params = new URLSearchParams();
  params.set('q', query);
  params.set('per_page', String(options.perPage ?? 30));
  params.set('sort', options.sort ?? 'updated');
  params.set('order', options.order ?? 'desc');
  const res = await githubFetch(`/search/issues?${params.toString()}`, token);
  return (await res.json()) as IssueSearchResponse;
}

export interface PullRequestDetails {
  number: number;
  changed_files: number;
  additions: number;
  deletions: number;
  user: { login: string; avatar_url: string } | null;
}

export async function fetchPullRequestDetails(
  token: string,
  owner: string,
  repo: string,
  number: number,
): Promise<PullRequestDetails> {
  const res = await githubFetch(`/repos/${owner}/${repo}/pulls/${number}`, token);
  return (await res.json()) as PullRequestDetails;
}

export interface RepoCoordinates {
  owner: string;
  repo: string;
}

export function parseRepoFromUrl(repositoryUrl: string): RepoCoordinates | null {
  // https://api.github.com/repos/{owner}/{repo}
  const match = /\/repos\/([^/]+)\/([^/]+)$/.exec(repositoryUrl);
  if (!match) return null;
  return { owner: match[1], repo: match[2] };
}

export async function fetchDashboardCounts(
  token: string,
  login: string,
): Promise<DashboardCounts> {
  const [assignedPrs, reviewRequests, mentions, notifications] = await Promise.all([
    fetchAssignedPrCount(token, login),
    fetchReviewRequestCount(token, login),
    fetchMentionCount(token, login),
    fetchNotificationCount(token),
  ]);
  return { assignedPrs, reviewRequests, mentions, notifications };
}
