export const GITHUB_API_BASE = 'https://api.github.com';

export interface Viewer {
  login: string;
  id: number;
  name: string | null;
  avatar_url: string;
  html_url: string;
}

export interface DashboardCounts {
  assigned: number;
  reviewRequested: number;
  mentions: number;
  notifications: number;
}

export interface IssueSearchUser {
  login: string;
  avatar_url: string;
  html_url: string;
}

export interface IssueSearchItem {
  id: number;
  number: number;
  title: string;
  html_url: string;
  repository_url: string;
  state: 'open' | 'closed';
  draft?: boolean;
  updated_at: string;
  created_at: string;
  user: IssueSearchUser | null;
  body: string | null;
  labels: Array<{ name: string; color: string }>;
  pull_request?: { url: string; html_url: string; draft?: boolean } | null;
  // Present on PRs returned by /search/issues via "requested_reviews"
  // is not standard, so we keep it optional.
}

export interface IssueSearchResponse {
  total_count: number;
  incomplete_results: boolean;
  items: IssueSearchItem[];
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

export async function githubFetch(path: string, token: string): Promise<Response> {
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

interface SearchCountResponse {
  total_count: number;
}

async function searchCount(query: string, token: string): Promise<number> {
  // per_page=1 keeps the payload small; we only need total_count.
  const res = await githubFetch(
    `/search/issues?per_page=1&q=${encodeURIComponent(query)}`,
    token,
  );
  const data = (await res.json()) as SearchCountResponse;
  return data.total_count ?? 0;
}

async function notificationsCount(token: string): Promise<number> {
  // /notifications doesn't return a total_count; fetch up to 50 unread items
  // (the popup's dashboard only ever renders the count, so this is enough).
  const res = await githubFetch('/notifications?all=false&per_page=50', token);
  const data = (await res.json()) as unknown[];
  return Array.isArray(data) ? data.length : 0;
}

export interface PullRequestDetail {
  number: number;
  changed_files: number;
  additions: number;
  deletions: number;
}

export async function fetchPullRequestDetail(
  owner: string,
  repo: string,
  number: number,
  token: string,
): Promise<PullRequestDetail> {
  const res = await githubFetch(`/repos/${owner}/${repo}/pulls/${number}`, token);
  const data = (await res.json()) as PullRequestDetail;
  return {
    number: data.number,
    changed_files: data.changed_files ?? 0,
    additions: data.additions ?? 0,
    deletions: data.deletions ?? 0,
  };
}

export interface NotificationThread {
  id: string;
  unread: boolean;
  reason: string;
  updated_at: string;
  subject: {
    title: string;
    url: string | null;
    latest_comment_url: string | null;
    type: 'PullRequest' | 'Issue' | 'Commit' | 'Release' | 'Discussion' | 'CheckSuite' | string;
  };
  repository: {
    id: number;
    name: string;
    full_name: string;
    html_url: string;
  };
}

export async function fetchNotifications(token: string): Promise<NotificationThread[]> {
  const res = await githubFetch('/notifications?all=false&per_page=50', token);
  const data = (await res.json()) as NotificationThread[];
  return Array.isArray(data) ? data : [];
}

async function githubMutate(
  method: 'POST' | 'PATCH' | 'PUT',
  path: string,
  token: string,
  body?: unknown,
): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(`${GITHUB_API_BASE}${path}`, {
      method,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
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
  if (!response.ok && response.status !== 205) {
    throw new GitHubApiError(
      `GitHub API error (${response.status})`,
      response.status,
      response.status === 403 ? 'forbidden' : 'other',
    );
  }
  return response;
}

export async function markPullRequestReviewed(
  owner: string,
  repo: string,
  number: number,
  token: string,
): Promise<void> {
  await githubMutate('POST', `/repos/${owner}/${repo}/pulls/${number}/reviews`, token, {
    event: 'COMMENT',
    body: 'Reviewed via GitHub Workflow Assistant.',
  });
}

export async function addIssueReaction(
  owner: string,
  repo: string,
  number: number,
  content: '+1' | 'heart' | 'hooray' | 'rocket' | 'eyes',
  token: string,
): Promise<void> {
  await githubMutate(
    'POST',
    `/repos/${owner}/${repo}/issues/${number}/reactions`,
    token,
    { content },
  );
}

export async function postIssueComment(
  owner: string,
  repo: string,
  number: number,
  body: string,
  token: string,
): Promise<void> {
  await githubMutate(
    'POST',
    `/repos/${owner}/${repo}/issues/${number}/comments`,
    token,
    { body },
  );
}

export async function markNotificationRead(id: string, token: string): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`${GITHUB_API_BASE}/notifications/threads/${id}`, {
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
  if (!response.ok && response.status !== 205) {
    throw new GitHubApiError(
      `Failed to mark notification read (${response.status})`,
      response.status,
      response.status === 401 ? 'unauthorized' : 'other',
    );
  }
}

/**
 * Derive the github.com URL for a notification subject. The API returns an
 * `api.github.com/repos/...` URL; the popup wants the human-facing URL.
 */
export function notificationHtmlUrl(thread: NotificationThread): string {
  const subject = thread.subject.url ?? '';
  if (!subject) return thread.repository.html_url;
  // /repos/owner/repo/pulls/123  →  https://github.com/owner/repo/pull/123
  // /repos/owner/repo/issues/123 →  https://github.com/owner/repo/issues/123
  const m = subject.match(/\/repos\/([^/]+)\/([^/]+)\/(pulls|issues)\/(\d+)/);
  if (m) {
    const [, owner, repo, kind, num] = m;
    const path = kind === 'pulls' ? 'pull' : 'issues';
    return `https://github.com/${owner}/${repo}/${path}/${num}`;
  }
  return thread.repository.html_url;
}

export async function searchIssues(
  query: string,
  token: string,
  perPage = 30,
): Promise<IssueSearchItem[]> {
  const res = await githubFetch(
    `/search/issues?per_page=${perPage}&q=${encodeURIComponent(query)}`,
    token,
  );
  const data = (await res.json()) as IssueSearchResponse;
  return data.items ?? [];
}

export async function fetchDashboardCounts(
  token: string,
  login: string,
): Promise<DashboardCounts> {
  const [assigned, reviewRequested, mentions, notifications] = await Promise.all([
    searchCount(`is:pr is:open assignee:${login}`, token),
    searchCount(`is:pr is:open review-requested:${login}`, token),
    searchCount(`is:open mentions:${login}`, token),
    notificationsCount(token),
  ]);
  return { assigned, reviewRequested, mentions, notifications };
}
