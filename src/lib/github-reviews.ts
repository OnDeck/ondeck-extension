import { GitHubApiError, GITHUB_API_BASE } from './github-api';

export interface ReviewItem {
  id: number;
  number: number;
  title: string;
  html_url: string;
  repository_url: string;
  draft?: boolean;
  user: { login: string; avatar_url: string } | null;
  labels: { name: string }[];
  updated_at: string;
  pull_request?: { html_url: string };
}

interface SearchResponse {
  total_count: number;
  items: ReviewItem[];
}

export interface ReviewItemDetailed extends ReviewItem {
  changedFiles: number | null;
  blocking: boolean;
}

const PRIORITY_LABEL_RE = /(blocking|priority\s*[/:]?\s*(high|p0|p1)|urgent|deploy)/i;

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

export function repoSlug(item: ReviewItem): string {
  return item.repository_url.split('/repos/')[1] ?? '';
}

export async function fetchReviewRequests(
  login: string,
  token: string,
): Promise<ReviewItemDetailed[]> {
  const q = encodeURIComponent(`is:pr is:open review-requested:${login}`);
  const data = await ghJson<SearchResponse>(
    `/search/issues?q=${q}&per_page=20&sort=updated&order=desc`,
    token,
  );
  // Hydrate files-changed counts from the PR endpoint in parallel.
  const detailed = await Promise.all(
    data.items.map(async (item) => {
      const slug = repoSlug(item);
      let changedFiles: number | null = null;
      try {
        const pr = await ghJson<{ changed_files: number }>(
          `/repos/${slug}/pulls/${item.number}`,
          token,
        );
        changedFiles = pr.changed_files;
      } catch {
        changedFiles = null;
      }
      const blocking = item.labels.some((l) => PRIORITY_LABEL_RE.test(l.name));
      return { ...item, changedFiles, blocking };
    }),
  );
  return detailed;
}
