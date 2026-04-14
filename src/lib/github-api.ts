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

export interface ReviewPrItem {
  id: number;
  number: number;
  title: string;
  html_url: string;
  repository_url: string;
  updated_at: string;
  labels: { name: string }[];
  user: { login: string; avatar_url: string } | null;
  pull_request?: { html_url: string };
}

interface SearchResp {
  items: ReviewPrItem[];
}

export function repoSlugFromRepositoryUrl(repositoryUrl: string): string {
  const match = /\/repos\/([^/]+\/[^/]+)$/.exec(repositoryUrl);
  return match ? match[1] : repositoryUrl;
}

export async function fetchReviewRequests(
  login: string,
  token: string,
): Promise<ReviewPrItem[]> {
  const res = await githubFetch(
    `/search/issues?q=${encodeURIComponent(
      `is:pr is:open review-requested:${login}`,
    )}&per_page=30&sort=updated&order=desc`,
    token,
  );
  const data = (await res.json()) as SearchResp;
  return data.items ?? [];
}

interface PullRequestDetails {
  changed_files: number;
}

/**
 * Fetch the file-count for a given PR. Path is /repos/{owner}/{repo}/pulls/{number}.
 */
export async function fetchPrChangedFiles(
  owner: string,
  repo: string,
  number: number,
  token: string,
): Promise<number> {
  const res = await githubFetch(`/repos/${owner}/${repo}/pulls/${number}`, token);
  const data = (await res.json()) as PullRequestDetails;
  return data.changed_files ?? 0;
}

export function isBlockingPriority(labels: { name: string }[]): boolean {
  return labels.some((l) => {
    const name = l.name.toLowerCase();
    return (
      name.includes('blocking') ||
      name.includes('urgent') ||
      name.includes('p0') ||
      name.includes('priority: high')
    );
  });
}
