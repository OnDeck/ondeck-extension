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

export type PullRequestState = 'open' | 'draft' | 'changes_requested';

export interface PullRequestSummary {
  id: number;
  number: number;
  title: string;
  html_url: string;
  repo: string;
  org: string;
  state: PullRequestState;
  draft: boolean;
  created_at: string;
  updated_at: string;
  author: { login: string; avatar_url: string } | null;
}

interface SearchIssueItem {
  id: number;
  number: number;
  title: string;
  html_url: string;
  repository_url: string;
  draft?: boolean;
  state: string;
  created_at: string;
  updated_at: string;
  user: { login: string; avatar_url: string } | null;
  labels?: { name: string }[];
  pull_request?: { html_url: string };
}

interface SearchIssuesResponse {
  total_count: number;
  items: SearchIssueItem[];
}

function parseRepo(repositoryUrl: string): { org: string; repo: string } {
  // repository_url looks like https://api.github.com/repos/{org}/{repo}
  const parts = repositoryUrl.split('/');
  return { org: parts[parts.length - 2] ?? '', repo: parts[parts.length - 1] ?? '' };
}

function toPullRequestSummary(item: SearchIssueItem): PullRequestSummary {
  const { org, repo } = parseRepo(item.repository_url);
  const changesRequested = item.labels?.some(
    (l) => l.name.toLowerCase() === 'changes requested',
  );
  const state: PullRequestState = item.draft
    ? 'draft'
    : changesRequested
      ? 'changes_requested'
      : 'open';
  return {
    id: item.id,
    number: item.number,
    title: item.title,
    html_url: item.html_url,
    repo,
    org,
    state,
    draft: Boolean(item.draft),
    created_at: item.created_at,
    updated_at: item.updated_at,
    author: item.user
      ? { login: item.user.login, avatar_url: item.user.avatar_url }
      : null,
  };
}

async function searchPullRequests(
  token: string,
  query: string,
): Promise<PullRequestSummary[]> {
  const res = await githubFetch(
    `/search/issues?q=${encodeURIComponent(query)}&per_page=30&sort=updated&order=desc`,
    token,
  );
  const data = (await res.json()) as SearchIssuesResponse;
  return data.items.map(toPullRequestSummary);
}

export function fetchAssignedPullRequests(
  token: string,
  login: string,
): Promise<PullRequestSummary[]> {
  return searchPullRequests(token, `is:pr is:open assignee:${login}`);
}
