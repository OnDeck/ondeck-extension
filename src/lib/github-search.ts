import { GitHubApiError, GITHUB_API_BASE } from './github-api';

export interface SearchIssueItem {
  id: number;
  number: number;
  title: string;
  html_url: string;
  repository_url: string;
  state: 'open' | 'closed';
  draft?: boolean;
  user: { login: string; avatar_url: string } | null;
  labels: { name: string; color: string }[];
  created_at: string;
  updated_at: string;
  pull_request?: { merged_at: string | null; html_url: string };
}

interface SearchResponse {
  total_count: number;
  items: SearchIssueItem[];
}

async function searchIssues(
  query: string,
  token: string,
  perPage = 30,
): Promise<SearchResponse> {
  const url =
    `${GITHUB_API_BASE}/search/issues` +
    `?q=${encodeURIComponent(query)}&per_page=${perPage}&sort=updated&order=desc`;
  let res: Response;
  try {
    res = await fetch(url, {
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
    throw new GitHubApiError(`GitHub search error (${res.status})`, res.status, 'other');
  }
  return (await res.json()) as SearchResponse;
}

export function fetchAssignedPRs(login: string, token: string) {
  return searchIssues(`is:pr is:open assignee:${login}`, token);
}

export function fetchReviewRequestedPRs(login: string, token: string) {
  return searchIssues(`is:pr is:open review-requested:${login}`, token);
}

export function fetchMentions(login: string, token: string) {
  return searchIssues(`is:open mentions:${login}`, token);
}

export function repoFromIssue(item: SearchIssueItem): string {
  // repository_url shape: https://api.github.com/repos/<owner>/<repo>
  const parts = item.repository_url.split('/repos/');
  return parts[1] ?? '';
}
