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

// ---------- Review requests ----------

export interface PullRequestSummary {
  id: number;
  number: number;
  title: string;
  html_url: string;
  updated_at: string;
  created_at: string;
  repository_url: string;
  user: { login: string; avatar_url: string } | null;
  labels: Array<{ name: string; color: string }>;
  draft?: boolean;
}

interface IssueSearchResponse {
  total_count: number;
  items: PullRequestSummary[];
}

export interface ReviewRequestItem extends PullRequestSummary {
  /** Files changed count, fetched lazily from the PR endpoint. null until loaded. */
  changed_files: number | null;
  /** True when a label suggests the PR is blocking a deploy. */
  isBlocking: boolean;
}

/** Derives "org/repo" from the repository_url the search API returns. */
export function parseRepoSlug(repositoryUrl: string): string {
  const marker = '/repos/';
  const idx = repositoryUrl.indexOf(marker);
  if (idx === -1) return repositoryUrl;
  return repositoryUrl.slice(idx + marker.length);
}

function detectBlocking(labels: Array<{ name: string }>): boolean {
  return labels.some((l) => {
    const name = l.name.toLowerCase();
    return (
      name.includes('blocking') ||
      name.includes('blocker') ||
      name === 'priority: critical' ||
      name === 'p0'
    );
  });
}

export async function fetchReviewRequests(
  login: string,
  token: string,
): Promise<ReviewRequestItem[]> {
  const res = await githubFetch(
    `/search/issues?q=${encodeURIComponent(
      `is:pr is:open review-requested:${login}`,
    )}&per_page=30&sort=updated&order=desc`,
    token,
  );
  const data = (await res.json()) as IssueSearchResponse;
  const items = data.items ?? [];
  return items.map((item) => ({
    ...item,
    changed_files: null,
    isBlocking: detectBlocking(item.labels ?? []),
  }));
}

/** Fetches the files-changed count for a single PR. */
export async function fetchPullRequestChangedFiles(
  repo: string,
  pullNumber: number,
  token: string,
): Promise<number> {
  const res = await githubFetch(`/repos/${repo}/pulls/${pullNumber}`, token);
  const data = (await res.json()) as { changed_files?: number };
  return data.changed_files ?? 0;
}
