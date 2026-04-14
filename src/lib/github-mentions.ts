import { GitHubApiError, GITHUB_API_BASE } from './github-api';

export interface MentionItem {
  id: number;
  number: number;
  title: string;
  body: string | null;
  html_url: string;
  repository_url: string;
  updated_at: string;
  pull_request?: { html_url: string };
}

interface SearchResponse {
  total_count: number;
  items: MentionItem[];
}

export async function fetchMentions(
  login: string,
  token: string,
): Promise<MentionItem[]> {
  const q = encodeURIComponent(`is:open mentions:${login}`);
  const url = `${GITHUB_API_BASE}/search/issues?q=${q}&per_page=30&sort=updated&order=desc`;
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
  const data = (await res.json()) as SearchResponse;
  return data.items;
}

export function repoSlug(item: MentionItem): string {
  return item.repository_url.split('/repos/')[1] ?? '';
}

export function snippet(body: string | null, login: string, max = 140): string {
  if (!body) return '';
  const needle = `@${login}`;
  const idx = body.toLowerCase().indexOf(needle.toLowerCase());
  if (idx < 0) {
    return body.length > max ? `${body.slice(0, max).trim()}…` : body;
  }
  const start = Math.max(0, idx - 40);
  const end = Math.min(body.length, idx + max - 40);
  let out = body.slice(start, end).replace(/\s+/g, ' ').trim();
  if (start > 0) out = `…${out}`;
  if (end < body.length) out = `${out}…`;
  return out;
}
