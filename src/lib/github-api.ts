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

export async function githubFetch(path: string, token: string, init: RequestInit = {}): Promise<Response> {
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

// ---------- Search helpers ----------

interface SearchIssuesResponse {
  total_count: number;
  incomplete_results: boolean;
  items: unknown[];
}

async function searchIssuesCount(query: string, token: string): Promise<number> {
  const res = await githubFetch(
    `/search/issues?per_page=1&q=${encodeURIComponent(query)}`,
    token,
  );
  const data = (await res.json()) as SearchIssuesResponse;
  return data.total_count ?? 0;
}

export async function fetchAssignedPrCount(login: string, token: string): Promise<number> {
  return searchIssuesCount(`is:pr is:open assignee:${login}`, token);
}

export async function fetchReviewRequestCount(login: string, token: string): Promise<number> {
  return searchIssuesCount(`is:pr is:open review-requested:${login}`, token);
}

export async function fetchMentionCount(login: string, token: string): Promise<number> {
  return searchIssuesCount(`is:open mentions:${login}`, token);
}

export async function fetchUnreadNotificationCount(token: string): Promise<number> {
  const res = await githubFetch('/notifications?all=false&per_page=50', token);
  const data = (await res.json()) as unknown[];
  return Array.isArray(data) ? data.length : 0;
}

export interface DashboardCounts {
  assignedPrs: number;
  reviewRequests: number;
  mentions: number;
  unreadNotifications: number;
}

export async function fetchDashboardCounts(
  login: string,
  token: string,
): Promise<DashboardCounts> {
  const [assignedPrs, reviewRequests, mentions, unreadNotifications] = await Promise.all([
    fetchAssignedPrCount(login, token),
    fetchReviewRequestCount(login, token),
    fetchMentionCount(login, token),
    fetchUnreadNotificationCount(token),
  ]);
  return { assignedPrs, reviewRequests, mentions, unreadNotifications };
}
