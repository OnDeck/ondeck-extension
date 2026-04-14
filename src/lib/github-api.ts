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

export interface DashboardCounts {
  assigned: number;
  reviews: number;
  mentions: number;
  notifications: number;
}

async function searchTotal(path: string, token: string): Promise<number> {
  const res = await githubFetch(path, token);
  const data = (await res.json()) as { total_count?: number };
  return data.total_count ?? 0;
}

async function notificationCount(token: string): Promise<number> {
  // The notifications endpoint does not expose total_count; the caller
  // pages the array. For an unread-badge count the first page up to 50
  // is a reasonable approximation and avoids excessive paging.
  const res = await githubFetch('/notifications?all=false&per_page=50', token);
  const data = (await res.json()) as unknown[];
  return Array.isArray(data) ? data.length : 0;
}

/**
 * Fetch the four dashboard counters in parallel. Any individual failure
 * propagates as a GitHubApiError so the UI can show a unified error state.
 */
export async function fetchDashboardCounts(
  token: string,
  login: string,
): Promise<DashboardCounts> {
  const user = encodeURIComponent(login);
  const [assigned, reviews, mentions, notifications] = await Promise.all([
    searchTotal(`/search/issues?q=is:pr+is:open+assignee:${user}&per_page=1`, token),
    searchTotal(`/search/issues?q=is:pr+is:open+review-requested:${user}&per_page=1`, token),
    searchTotal(`/search/issues?q=is:open+mentions:${user}&per_page=1`, token),
    notificationCount(token),
  ]);
  return { assigned, reviews, mentions, notifications };
}
