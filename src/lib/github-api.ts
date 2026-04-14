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
