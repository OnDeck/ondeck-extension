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
        ...(init.headers as Record<string, string> | undefined),
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

// -------- Search + counts --------

export interface SearchIssueItem {
  id: number;
  number: number;
  title: string;
  html_url: string;
  repository_url: string;
  state: string;
  draft?: boolean;
  created_at: string;
  updated_at: string;
  user: { login: string; avatar_url: string } | null;
  labels: { name: string; color: string }[];
  pull_request?: { html_url: string; draft?: boolean };
  body?: string | null;
}

export interface SearchIssuesResponse {
  total_count: number;
  incomplete_results: boolean;
  items: SearchIssueItem[];
}

export async function searchIssues(
  token: string,
  query: string,
  perPage = 30,
): Promise<SearchIssuesResponse> {
  const url = `/search/issues?q=${encodeURIComponent(query)}&per_page=${perPage}&sort=updated&order=desc`;
  const res = await githubFetch(url, token);
  return (await res.json()) as SearchIssuesResponse;
}

export interface NotificationItem {
  id: string;
  unread: boolean;
  reason: string;
  updated_at: string;
  subject: {
    title: string;
    url: string | null;
    latest_comment_url: string | null;
    type: 'PullRequest' | 'Issue' | 'Discussion' | 'Release' | string;
  };
  repository: {
    id: number;
    name: string;
    full_name: string;
    owner: { login: string; avatar_url: string };
    html_url: string;
  };
}

export async function fetchNotifications(
  token: string,
  { all = false }: { all?: boolean } = {},
): Promise<NotificationItem[]> {
  const res = await githubFetch(`/notifications?all=${all ? 'true' : 'false'}`, token);
  return (await res.json()) as NotificationItem[];
}

export async function markNotificationAsRead(token: string, id: string): Promise<void> {
  await githubFetch(`/notifications/threads/${id}`, token, { method: 'PATCH' });
}

export interface DashboardCounts {
  assigned: number;
  reviewRequested: number;
  mentions: number;
  notifications: number;
}

export async function fetchDashboardCounts(
  token: string,
  login: string,
): Promise<DashboardCounts> {
  const [assigned, reviews, mentions, notes] = await Promise.all([
    searchIssues(token, `is:pr is:open assignee:${login}`, 1),
    searchIssues(token, `is:pr is:open review-requested:${login}`, 1),
    searchIssues(token, `is:open mentions:${login}`, 1),
    fetchNotifications(token, { all: false }),
  ]);
  return {
    assigned: assigned.total_count,
    reviewRequested: reviews.total_count,
    mentions: mentions.total_count,
    notifications: notes.length,
  };
}
