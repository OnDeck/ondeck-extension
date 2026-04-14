import { GitHubApiError, GITHUB_API_BASE } from './github-api';

export interface DashboardCounts {
  assignedPRs: number;
  reviewRequests: number;
  mentions: number;
  notifications: number;
}

async function ghJson<T>(path: string, token: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${GITHUB_API_BASE}${path}`, {
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
  if (res.status === 401) {
    throw new GitHubApiError('Token is invalid or expired', 401, 'unauthorized');
  }
  if (res.status === 403) {
    throw new GitHubApiError('Forbidden — check token scopes', 403, 'forbidden');
  }
  if (!res.ok) {
    throw new GitHubApiError(`GitHub API error (${res.status})`, res.status, 'other');
  }
  return (await res.json()) as T;
}

interface SearchResponse {
  total_count: number;
}

interface NotificationItem {
  id: string;
  unread: boolean;
}

export async function fetchDashboardCounts(
  login: string,
  token: string,
): Promise<DashboardCounts> {
  const enc = encodeURIComponent;
  const [assigned, reviews, mentions, notifications] = await Promise.all([
    ghJson<SearchResponse>(
      `/search/issues?q=${enc(`is:pr is:open assignee:${login}`)}&per_page=1`,
      token,
    ),
    ghJson<SearchResponse>(
      `/search/issues?q=${enc(`is:pr is:open review-requested:${login}`)}&per_page=1`,
      token,
    ),
    ghJson<SearchResponse>(
      `/search/issues?q=${enc(`is:open mentions:${login}`)}&per_page=1`,
      token,
    ),
    ghJson<NotificationItem[]>(`/notifications?all=false&per_page=50`, token),
  ]);
  return {
    assignedPRs: assigned.total_count,
    reviewRequests: reviews.total_count,
    mentions: mentions.total_count,
    notifications: notifications.length,
  };
}
