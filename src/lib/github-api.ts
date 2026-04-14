export const GITHUB_API_BASE = 'https://api.github.com';

export interface Viewer {
  login: string;
  id: number;
  name: string | null;
  avatar_url: string;
  html_url: string;
}

export interface DashboardCounts {
  assigned: number;
  reviewRequested: number;
  mentions: number;
  notifications: number;
}

export interface IssueSearchUser {
  login: string;
  avatar_url: string;
  html_url: string;
}

export interface IssueSearchItem {
  id: number;
  number: number;
  title: string;
  html_url: string;
  repository_url: string;
  state: 'open' | 'closed';
  draft?: boolean;
  updated_at: string;
  created_at: string;
  user: IssueSearchUser | null;
  body: string | null;
  labels: Array<{ name: string; color: string }>;
  pull_request?: { url: string; html_url: string; draft?: boolean } | null;
  // Present on PRs returned by /search/issues via "requested_reviews"
  // is not standard, so we keep it optional.
}

export interface IssueSearchResponse {
  total_count: number;
  incomplete_results: boolean;
  items: IssueSearchItem[];
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

interface SearchCountResponse {
  total_count: number;
}

async function searchCount(query: string, token: string): Promise<number> {
  // per_page=1 keeps the payload small; we only need total_count.
  const res = await githubFetch(
    `/search/issues?per_page=1&q=${encodeURIComponent(query)}`,
    token,
  );
  const data = (await res.json()) as SearchCountResponse;
  return data.total_count ?? 0;
}

async function notificationsCount(token: string): Promise<number> {
  // /notifications doesn't return a total_count; fetch up to 50 unread items
  // (the popup's dashboard only ever renders the count, so this is enough).
  const res = await githubFetch('/notifications?all=false&per_page=50', token);
  const data = (await res.json()) as unknown[];
  return Array.isArray(data) ? data.length : 0;
}

export async function searchIssues(
  query: string,
  token: string,
  perPage = 30,
): Promise<IssueSearchItem[]> {
  const res = await githubFetch(
    `/search/issues?per_page=${perPage}&q=${encodeURIComponent(query)}`,
    token,
  );
  const data = (await res.json()) as IssueSearchResponse;
  return data.items ?? [];
}

export async function fetchDashboardCounts(
  token: string,
  login: string,
): Promise<DashboardCounts> {
  const [assigned, reviewRequested, mentions, notifications] = await Promise.all([
    searchCount(`is:pr is:open assignee:${login}`, token),
    searchCount(`is:pr is:open review-requested:${login}`, token),
    searchCount(`is:open mentions:${login}`, token),
    notificationsCount(token),
  ]);
  return { assigned, reviewRequested, mentions, notifications };
}
