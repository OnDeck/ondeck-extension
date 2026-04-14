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

// ---------- Search / issues ----------

export interface IssueSearchItem {
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
  pull_request?: { html_url: string };
}

interface IssueSearchResponse {
  total_count: number;
  items: IssueSearchItem[];
}

async function searchIssues(
  query: string,
  token: string,
  perPage = 30,
): Promise<IssueSearchItem[]> {
  const res = await githubFetch(
    `/search/issues?q=${encodeURIComponent(query)}&per_page=${perPage}&sort=updated&order=desc`,
    token,
  );
  const data = (await res.json()) as IssueSearchResponse;
  return data.items ?? [];
}

/** Derives "org/repo" from the repository_url the search API returns. */
export function parseRepoSlug(repositoryUrl: string): string {
  // https://api.github.com/repos/OWNER/REPO
  const marker = '/repos/';
  const idx = repositoryUrl.indexOf(marker);
  if (idx === -1) return repositoryUrl;
  return repositoryUrl.slice(idx + marker.length);
}

export async function fetchAssignedPullRequests(
  login: string,
  token: string,
): Promise<IssueSearchItem[]> {
  return searchIssues(`is:pr is:open assignee:${login}`, token);
}
