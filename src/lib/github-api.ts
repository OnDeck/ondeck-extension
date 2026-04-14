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

// ---------- Search + counts ----------

export interface SearchIssueItem {
  id: number;
  number: number;
  title: string;
  html_url: string;
  state: 'open' | 'closed';
  draft?: boolean;
  repository_url: string;
  created_at: string;
  updated_at: string;
  user: { login: string; avatar_url: string } | null;
  labels: { name: string; color: string }[];
  pull_request?: { html_url: string; draft?: boolean };
  body?: string | null;
  comments: number;
}

export interface SearchIssueResponse {
  total_count: number;
  incomplete_results: boolean;
  items: SearchIssueItem[];
}

export const SEARCH_QUERIES = {
  assignedPrs: 'is:pr is:open assignee:@me archived:false',
  mentions: 'is:open mentions:@me archived:false',
  reviewRequests: 'is:pr is:open review-requested:@me archived:false',
} as const;

function encodeQuery(q: string): string {
  return encodeURIComponent(q);
}

export async function searchIssues(
  token: string,
  query: string,
  opts: { perPage?: number; sort?: 'updated' | 'created'; order?: 'asc' | 'desc' } = {},
): Promise<SearchIssueResponse> {
  const { perPage = 30, sort = 'updated', order = 'desc' } = opts;
  const path = `/search/issues?q=${encodeQuery(query)}&sort=${sort}&order=${order}&per_page=${perPage}`;
  const res = await githubFetch(path, token);
  return (await res.json()) as SearchIssueResponse;
}

export async function searchIssuesCount(token: string, query: string): Promise<number> {
  // per_page=1 to keep the response small while still returning total_count.
  const path = `/search/issues?q=${encodeQuery(query)}&per_page=1`;
  const res = await githubFetch(path, token);
  const data = (await res.json()) as { total_count: number };
  return data.total_count ?? 0;
}

// ---------- Notifications ----------

export interface NotificationThread {
  id: string;
  unread: boolean;
  reason: string;
  updated_at: string;
  url: string;
  subject: {
    title: string;
    url: string | null;
    latest_comment_url: string | null;
    type: 'PullRequest' | 'Issue' | 'Discussion' | 'Release' | 'Commit' | string;
  };
  repository: {
    id: number;
    name: string;
    full_name: string;
    html_url: string;
    owner: { login: string; avatar_url: string };
  };
}

export async function fetchNotifications(
  token: string,
  opts: { all?: boolean } = {},
): Promise<NotificationThread[]> {
  const all = opts.all ? 'true' : 'false';
  const res = await githubFetch(`/notifications?all=${all}&per_page=50`, token);
  return (await res.json()) as NotificationThread[];
}

export async function fetchNotificationsCount(token: string): Promise<number> {
  const list = await fetchNotifications(token, { all: false });
  return list.length;
}

export async function markNotificationRead(token: string, threadId: string): Promise<void> {
  try {
    await fetch(`${GITHUB_API_BASE}/notifications/threads/${threadId}`, {
      method: 'PATCH',
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
}

// Parse "https://api.github.com/repos/<owner>/<repo>" into "owner/repo".
export function repoFullNameFromUrl(repositoryUrl: string): string {
  const parts = repositoryUrl.replace('https://api.github.com/repos/', '').split('/');
  if (parts.length < 2) return repositoryUrl;
  return `${parts[0]}/${parts[1]}`;
}

// Best-effort relative time in a tiny footprint.
export function relativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime();
  const delta = Math.max(0, now.getTime() - then);
  const sec = Math.floor(delta / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}
