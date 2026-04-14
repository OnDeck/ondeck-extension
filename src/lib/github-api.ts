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
  org: string;
  repo: string;
  requester: { login: string; avatar_url: string } | null;
  changed_files: number | null;
  blocking: boolean;
  updated_at: string;
}

interface SearchIssueItem {
  id: number;
  number: number;
  title: string;
  html_url: string;
  repository_url: string;
  user: { login: string; avatar_url: string } | null;
  pull_request?: { url?: string };
  labels?: { name: string }[];
  updated_at: string;
}

interface SearchIssuesResponse {
  total_count: number;
  items: SearchIssueItem[];
}

interface PullRequestDetail {
  changed_files: number;
}

function parseRepo(repositoryUrl: string): { org: string; repo: string } {
  const parts = repositoryUrl.split('/');
  return { org: parts[parts.length - 2] ?? '', repo: parts[parts.length - 1] ?? '' };
}

function isBlocking(labels: { name: string }[] | undefined): boolean {
  if (!labels) return false;
  return labels.some((l) => /blocking|priority:high|p0|urgent/i.test(l.name));
}

async function fetchChangedFiles(
  token: string,
  org: string,
  repo: string,
  number: number,
): Promise<number | null> {
  try {
    const res = await githubFetch(`/repos/${org}/${repo}/pulls/${number}`, token);
    const data = (await res.json()) as PullRequestDetail;
    return data.changed_files;
  } catch {
    return null;
  }
}

export async function fetchReviewRequests(
  token: string,
  login: string,
): Promise<ReviewRequestItem[]> {
  const res = await githubFetch(
    `/search/issues?q=${encodeURIComponent(`is:pr is:open review-requested:${login}`)}&per_page=30&sort=updated&order=desc`,
    token,
  );
  const data = (await res.json()) as SearchIssuesResponse;
  const items = await Promise.all(
    data.items.map(async (item) => {
      const { org, repo } = parseRepo(item.repository_url);
      const changedFiles = await fetchChangedFiles(token, org, repo, item.number);
      return {
        id: item.id,
        number: item.number,
        title: item.title,
        html_url: item.html_url,
        org,
        repo,
        requester: item.user
          ? { login: item.user.login, avatar_url: item.user.avatar_url }
          : null,
        changed_files: changedFiles,
        blocking: isBlocking(item.labels),
        updated_at: item.updated_at,
      } satisfies ReviewRequestItem;
    }),
  );
  return items;
}
