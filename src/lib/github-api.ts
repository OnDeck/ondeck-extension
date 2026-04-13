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

export interface ReviewRequestItem {
  id: number;
  number: number;
  title: string;
  html_url: string;
  repository_url: string;
  updated_at: string;
  user: { login: string; avatar_url: string } | null;
  labels: { name: string }[];
  draft?: boolean;
  pull_request: { url: string };
}

interface IssueSearchResponse {
  total_count: number;
  items: ReviewRequestItem[];
}

export function repoSlugFromUrl(repositoryUrl: string): string {
  const match = repositoryUrl.match(/repos\/([^/]+\/[^/]+)$/);
  return match ? match[1] : repositoryUrl;
}

interface PullRequestDetail {
  changed_files: number;
}

export async function fetchReviewRequests(
  token: string,
  login: string,
): Promise<ReviewRequestItem[]> {
  const query = `is:pr is:open review-requested:${login}`;
  const res = await githubFetch(
    `/search/issues?q=${encodeURIComponent(query)}&per_page=50&sort=updated&order=desc`,
    token,
  );
  const data = (await res.json()) as IssueSearchResponse;
  return data.items ?? [];
}

export async function fetchPullRequestChangedFiles(
  token: string,
  pullRequestUrl: string,
): Promise<number | null> {
  // pullRequestUrl looks like https://api.github.com/repos/foo/bar/pulls/12
  const url = pullRequestUrl.replace(GITHUB_API_BASE, '');
  try {
    const res = await githubFetch(url, token);
    const detail = (await res.json()) as PullRequestDetail;
    return detail.changed_files ?? null;
  } catch {
    return null;
  }
}

const BLOCKING_LABELS = new Set([
  'blocking deploy',
  'blocking-deploy',
  'blocking',
  'priority: high',
  'priority/high',
  'urgent',
]);

export function isBlockingPriority(item: ReviewRequestItem): boolean {
  return item.labels.some((l) => BLOCKING_LABELS.has(l.name.toLowerCase()));
}
