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

export interface SearchIssuesResponse<T = unknown> {
  total_count: number;
  incomplete_results: boolean;
  items: T[];
}

async function searchIssues<T = unknown>(
  token: string,
  query: string,
  perPage = 30,
): Promise<SearchIssuesResponse<T>> {
  const params = new URLSearchParams({
    q: query,
    per_page: String(perPage),
    sort: 'updated',
    order: 'desc',
  });
  const res = await githubFetch(`/search/issues?${params.toString()}`, token);
  return (await res.json()) as SearchIssuesResponse<T>;
}

export async function fetchSearchCount(token: string, query: string): Promise<number> {
  const data = await searchIssues<unknown>(token, query, 1);
  return data.total_count;
}

export interface DashboardCounts {
  assignedPrs: number;
  reviewRequests: number;
  mentions: number;
  notifications: number;
}

export async function fetchDashboardCounts(
  token: string,
  login: string,
): Promise<DashboardCounts> {
  const [assignedPrs, reviewRequests, mentions, notifications] = await Promise.all([
    fetchSearchCount(token, `is:pr is:open assignee:${login}`),
    fetchSearchCount(token, `is:pr is:open review-requested:${login}`),
    fetchSearchCount(token, `is:open mentions:${login}`),
    fetchUnreadNotificationCount(token),
  ]);
  return { assignedPrs, reviewRequests, mentions, notifications };
}

export async function fetchUnreadNotificationCount(token: string): Promise<number> {
  // /notifications doesn't expose a total_count header reliably; fetch first
  // page and rely on the Link header for pagination-aware counts. For the
  // dashboard badge we only need a best-effort number, so cap the page size
  // and fall back to the returned array length.
  const res = await githubFetch('/notifications?all=false&per_page=50', token);
  const link = res.headers.get('Link') ?? '';
  const data = (await res.json()) as unknown[];
  const lastMatch = link.match(/page=(\d+)[^>]*>;\s*rel="last"/);
  if (lastMatch) {
    const lastPage = Number(lastMatch[1]);
    if (Number.isFinite(lastPage) && lastPage > 1) {
      // Best-effort estimate: (lastPage - 1) * per_page + items on current
      // page would require another round trip. Users mostly want to know if
      // there's something to handle, so cap at 99+ with the first page count.
      return (lastPage - 1) * 50 + data.length;
    }
  }
  return data.length;
}

export interface SearchIssueItem {
  id: number;
  number: number;
  title: string;
  html_url: string;
  state: string;
  draft?: boolean;
  updated_at: string;
  created_at: string;
  repository_url: string;
  user: { login: string; avatar_url: string } | null;
  labels: Array<{ name: string; color: string }>;
  pull_request?: { url: string; html_url: string };
  body?: string | null;
}

export async function fetchSearchIssues(
  token: string,
  query: string,
  perPage = 30,
): Promise<SearchIssuesResponse<SearchIssueItem>> {
  return searchIssues<SearchIssueItem>(token, query, perPage);
}

export function repoSlugFromUrl(repositoryUrl: string): string {
  // repositoryUrl looks like https://api.github.com/repos/OWNER/REPO
  const parts = repositoryUrl.split('/repos/')[1] ?? '';
  return parts;
}
