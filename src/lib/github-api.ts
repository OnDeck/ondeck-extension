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

export type MentionKind = 'pull_request' | 'issue';

export interface MentionItem {
  id: number;
  number: number;
  title: string;
  html_url: string;
  org: string;
  repo: string;
  kind: MentionKind;
  body_snippet: string;
  updated_at: string;
}

interface SearchIssueItem {
  id: number;
  number: number;
  title: string;
  html_url: string;
  repository_url: string;
  body?: string | null;
  pull_request?: unknown;
  updated_at: string;
}

interface SearchIssuesResponse {
  total_count: number;
  items: SearchIssueItem[];
}

function parseRepo(repositoryUrl: string): { org: string; repo: string } {
  const parts = repositoryUrl.split('/');
  return { org: parts[parts.length - 2] ?? '', repo: parts[parts.length - 1] ?? '' };
}

function snippetForMention(body: string | null | undefined, login: string): string {
  if (!body) return '';
  const needle = `@${login}`;
  const idx = body.toLowerCase().indexOf(needle.toLowerCase());
  if (idx < 0) return body.slice(0, 140).trim();
  const start = Math.max(0, idx - 40);
  const end = Math.min(body.length, idx + needle.length + 80);
  const prefix = start > 0 ? '… ' : '';
  const suffix = end < body.length ? ' …' : '';
  return `${prefix}${body.slice(start, end).replace(/\s+/g, ' ').trim()}${suffix}`;
}

export async function fetchMentions(
  token: string,
  login: string,
): Promise<MentionItem[]> {
  const res = await githubFetch(
    `/search/issues?q=${encodeURIComponent(`mentions:${login} is:open`)}&per_page=30&sort=updated&order=desc`,
    token,
  );
  const data = (await res.json()) as SearchIssuesResponse;
  return data.items.map<MentionItem>((item) => {
    const { org, repo } = parseRepo(item.repository_url);
    return {
      id: item.id,
      number: item.number,
      title: item.title,
      html_url: item.html_url,
      org,
      repo,
      kind: item.pull_request ? 'pull_request' : 'issue',
      body_snippet: snippetForMention(item.body, login),
      updated_at: item.updated_at,
    };
  });
}
