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

// ---------- Search + notifications helpers ----------

interface SearchIssuesResponse {
  total_count: number;
  incomplete_results: boolean;
  items: unknown[];
}

/**
 * Run a GitHub issue search and return the total count. The caller is
 * responsible for constructing a valid search qualifier string.
 */
export async function searchIssuesCount(token: string, query: string): Promise<number> {
  const params = new URLSearchParams({ q: query, per_page: '1' });
  const res = await githubFetch(`/search/issues?${params.toString()}`, token);
  const data = (await res.json()) as SearchIssuesResponse;
  return data.total_count ?? 0;
}

export interface DashboardCounts {
  assignedPrs: number;
  reviewRequests: number;
  mentions: number;
  notifications: number;
}

/**
 * Fetch counts for the four dashboard rows in parallel. Each individual
 * request is awaited with Promise.allSettled so one failure doesn't sink
 * the entire dashboard — failed fetches surface as 0 and the caller can
 * decide how to render partial failure.
 */
export async function fetchDashboardCounts(
  token: string,
  login: string,
): Promise<DashboardCounts> {
  const assignedQuery = `is:pr is:open assignee:${login}`;
  const reviewQuery = `is:pr is:open review-requested:${login}`;
  const mentionsQuery = `is:open mentions:${login}`;

  const [assigned, reviews, mentions, notifications] = await Promise.all([
    searchIssuesCount(token, assignedQuery),
    searchIssuesCount(token, reviewQuery),
    searchIssuesCount(token, mentionsQuery),
    fetchUnreadNotificationsCount(token),
  ]);

  return {
    assignedPrs: assigned,
    reviewRequests: reviews,
    mentions,
    notifications,
  };
}

/**
 * Count unread notifications. The /notifications endpoint paginates, so
 * we walk pages until exhausted (capped at 10 pages / 500 notifications
 * to avoid runaway loops for very noisy inboxes).
 */
export async function fetchUnreadNotificationsCount(token: string): Promise<number> {
  const perPage = 50;
  const maxPages = 10;
  let total = 0;
  for (let page = 1; page <= maxPages; page += 1) {
    const res = await githubFetch(
      `/notifications?all=false&per_page=${perPage}&page=${page}`,
      token,
    );
    const items = (await res.json()) as unknown[];
    total += items.length;
    if (items.length < perPage) break;
  }
  return total;
}
