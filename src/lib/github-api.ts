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

export async function githubFetch(path: string, token: string): Promise<Response> {
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

export interface DashboardCounts {
  assignedPrs: number;
  reviewRequests: number;
  mentions: number;
  unreadNotifications: number;
}

interface SearchResponse {
  total_count: number;
}

async function fetchSearchCount(query: string, token: string): Promise<number> {
  const res = await githubFetch(
    `/search/issues?q=${encodeURIComponent(query)}&per_page=1`,
    token,
  );
  const data = (await res.json()) as SearchResponse;
  return data.total_count ?? 0;
}

export async function fetchAssignedPrCount(login: string, token: string): Promise<number> {
  return fetchSearchCount(`is:pr is:open assignee:${login}`, token);
}

export async function fetchReviewRequestedCount(
  login: string,
  token: string,
): Promise<number> {
  return fetchSearchCount(`is:pr is:open review-requested:${login}`, token);
}

export async function fetchMentionsCount(login: string, token: string): Promise<number> {
  return fetchSearchCount(`is:open mentions:${login}`, token);
}

export async function fetchUnreadNotificationsCount(token: string): Promise<number> {
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
  | 'CheckSuite';

export interface NotificationItem {
  id: string;
  unread: boolean;
  reason: string;
  updated_at: string;
  subject: {
    title: string;
    url: string | null;
    latest_comment_url: string | null;
    type: NotificationSubjectType | string;
  };
  repository: {
    full_name: string;
    html_url: string;
  };
}

export async function fetchNotifications(token: string): Promise<NotificationItem[]> {
  const res = await githubFetch('/notifications?all=false&per_page=50', token);
  const data = (await res.json()) as NotificationItem[];
  return Array.isArray(data) ? data : [];
}

export async function markNotificationRead(id: string, token: string): Promise<void> {
  await githubFetch(`/notifications/threads/${id}`, token).catch(() => undefined);
  // PATCH variant — githubFetch is GET-only, so do a direct fetch
  await fetch(`${GITHUB_API_BASE}/notifications/threads/${id}`, {
    method: 'PATCH',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
}

export function notificationHtmlUrl(item: NotificationItem): string {
  const apiUrl = item.subject.url ?? '';
  if (!apiUrl) return item.repository.html_url;
  // Convert API URL to html URL.
  // e.g. https://api.github.com/repos/o/r/pulls/1 → https://github.com/o/r/pull/1
  return apiUrl
    .replace('https://api.github.com/repos/', 'https://github.com/')
    .replace('/pulls/', '/pull/')
    .replace('/commits/', '/commit/');
}

export interface PullRequestRef {
  url: string;
  html_url: string;
}

export interface SearchIssueItem {
  id: number;
  number: number;
  title: string;
  html_url: string;
  state: 'open' | 'closed';
  draft?: boolean;
  repository_url: string;
  updated_at: string;
  created_at: string;
  body: string | null;
  user: { login: string; avatar_url: string } | null;
  labels: Array<{ name: string; color: string }>;
  pull_request?: PullRequestRef;
}

interface SearchIssueResponse {
  total_count: number;
  items: SearchIssueItem[];
}

export async function searchIssues(
  query: string,
  token: string,
  perPage = 30,
): Promise<SearchIssueItem[]> {
  const res = await githubFetch(
    `/search/issues?q=${encodeURIComponent(query)}&per_page=${perPage}&sort=updated&order=desc`,
    token,
  );
  const data = (await res.json()) as SearchIssueResponse;
  return data.items ?? [];
}

export interface PullRequestDetail {
  changed_files: number;
  additions: number;
  deletions: number;
}

export async function fetchPullRequestDetail(
  repoFullName: string,
  number: number,
  token: string,
): Promise<PullRequestDetail> {
  const res = await githubFetch(`/repos/${repoFullName}/pulls/${number}`, token);
  const data = (await res.json()) as PullRequestDetail;
  return {
    changed_files: data.changed_files ?? 0,
    additions: data.additions ?? 0,
    deletions: data.deletions ?? 0,
  };
}

export function repoFromIssue(item: SearchIssueItem): string {
  // repository_url is like https://api.github.com/repos/owner/repo
  return item.repository_url.replace('https://api.github.com/repos/', '');
}

export async function fetchDashboardCounts(
  login: string,
  token: string,
): Promise<DashboardCounts> {
  const [assignedPrs, reviewRequests, mentions, unreadNotifications] = await Promise.all([
    fetchAssignedPrCount(login, token),
    fetchReviewRequestedCount(login, token),
    fetchMentionsCount(login, token),
    fetchUnreadNotificationsCount(token),
  ]);
  return { assignedPrs, reviewRequests, mentions, unreadNotifications };
}
