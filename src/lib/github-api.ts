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

export async function githubFetch(path: string, token: string, init: RequestInit = {}): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(`${GITHUB_API_BASE}${path}`, {
      ...init,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(init.headers ?? {}),
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
  if (!response.ok && response.status !== 304) {
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

// ---------- Search helpers ----------

export interface SearchUser {
  login: string;
  avatar_url: string;
  html_url: string;
}

export interface SearchLabel {
  name: string;
  color: string;
}

export interface SearchIssueItem {
  id: number;
  number: number;
  title: string;
  html_url: string;
  state: 'open' | 'closed';
  draft?: boolean;
  user: SearchUser | null;
  labels: SearchLabel[];
  repository_url: string;
  pull_request?: { html_url: string; merged_at: string | null } | null;
  comments: number;
  created_at: string;
  updated_at: string;
  body?: string | null;
}

interface SearchIssuesResponse {
  total_count: number;
  incomplete_results: boolean;
  items: SearchIssueItem[];
}

async function searchIssuesCount(query: string, token: string): Promise<number> {
  const res = await githubFetch(
    `/search/issues?per_page=1&q=${encodeURIComponent(query)}`,
    token,
  );
  const data = (await res.json()) as SearchIssuesResponse;
  return data.total_count ?? 0;
}

export async function searchIssues(
  query: string,
  token: string,
  perPage = 30,
): Promise<SearchIssueItem[]> {
  const res = await githubFetch(
    `/search/issues?per_page=${perPage}&sort=updated&order=desc&q=${encodeURIComponent(query)}`,
    token,
  );
  const data = (await res.json()) as SearchIssuesResponse;
  return data.items ?? [];
}

/**
 * GitHub's search API returns an API URL for the repo (e.g.
 * https://api.github.com/repos/owner/name). Extract the `owner/name` slug
 * for display.
 */
export function repoSlugFromUrl(repositoryUrl: string): string {
  const match = repositoryUrl.match(/\/repos\/([^/]+\/[^/]+)$/);
  return match ? match[1] : repositoryUrl;
}

export async function fetchAssignedPrCount(login: string, token: string): Promise<number> {
  return searchIssuesCount(`is:pr is:open assignee:${login}`, token);
}

export async function fetchAssignedPrs(
  login: string,
  token: string,
): Promise<SearchIssueItem[]> {
  return searchIssues(`is:pr is:open assignee:${login}`, token);
}

export async function fetchReviewRequestCount(login: string, token: string): Promise<number> {
  return searchIssuesCount(`is:pr is:open review-requested:${login}`, token);
}

export async function fetchReviewRequests(
  login: string,
  token: string,
): Promise<SearchIssueItem[]> {
  return searchIssues(`is:pr is:open review-requested:${login}`, token);
}

interface PullRequestDetail {
  changed_files: number;
  additions: number;
  deletions: number;
}

/** Post a PR review with event COMMENT and an empty body — used as a
 * non-destructive "mark as reviewed" quick action. */
export async function submitMarkReviewed(
  owner: string,
  repo: string,
  number: number,
  token: string,
): Promise<void> {
  await githubFetch(`/repos/${owner}/${repo}/pulls/${number}/reviews`, token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event: 'COMMENT', body: 'Reviewed.' }),
  });
}

/** Add a comment to an issue or PR (issues and PRs share this endpoint). */
export async function createIssueComment(
  owner: string,
  repo: string,
  number: number,
  body: string,
  token: string,
): Promise<void> {
  await githubFetch(`/repos/${owner}/${repo}/issues/${number}/comments`, token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body }),
  });
}

export type ReactionContent =
  | '+1'
  | '-1'
  | 'laugh'
  | 'hooray'
  | 'confused'
  | 'heart'
  | 'rocket'
  | 'eyes';

/** Add a reaction to an issue or PR. */
export async function addIssueReaction(
  owner: string,
  repo: string,
  number: number,
  content: ReactionContent,
  token: string,
): Promise<void> {
  await githubFetch(`/repos/${owner}/${repo}/issues/${number}/reactions`, token, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/vnd.github.squirrel-girl-preview+json',
    },
    body: JSON.stringify({ content }),
  });
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
    changed_files: data.changed_files,
    additions: data.additions,
    deletions: data.deletions,
  };
}

export async function fetchMentionCount(login: string, token: string): Promise<number> {
  return searchIssuesCount(`is:open mentions:${login}`, token);
}

export async function fetchMentions(
  login: string,
  token: string,
): Promise<SearchIssueItem[]> {
  return searchIssues(`is:open mentions:${login}`, token);
}

export async function fetchUnreadNotificationCount(token: string): Promise<number> {
  const res = await githubFetch('/notifications?all=false&per_page=50', token);
  const data = (await res.json()) as unknown[];
  return Array.isArray(data) ? data.length : 0;
}

export type NotificationReason =
  | 'assign'
  | 'author'
  | 'comment'
  | 'ci_activity'
  | 'invitation'
  | 'manual'
  | 'mention'
  | 'review_requested'
  | 'security_alert'
  | 'state_change'
  | 'subscribed'
  | 'team_mention'
  | (string & {});

export type NotificationSubjectType =
  | 'PullRequest'
  | 'Issue'
  | 'Discussion'
  | 'Release'
  | 'Commit'
  | (string & {});

export interface GitHubNotification {
  id: string;
  unread: boolean;
  reason: NotificationReason;
  updated_at: string;
  subject: {
    title: string;
    url: string | null;
    latest_comment_url: string | null;
    type: NotificationSubjectType;
  };
  repository: {
    id: number;
    name: string;
    full_name: string;
    html_url: string;
  };
}

export async function fetchNotifications(
  token: string,
  opts: { all?: boolean } = {},
): Promise<GitHubNotification[]> {
  const params = new URLSearchParams({
    all: opts.all ? 'true' : 'false',
    per_page: '50',
  });
  const res = await githubFetch(`/notifications?${params.toString()}`, token);
  const data = (await res.json()) as GitHubNotification[];
  return Array.isArray(data) ? data : [];
}

export async function markNotificationRead(
  threadId: string,
  token: string,
): Promise<void> {
  await githubFetch(`/notifications/threads/${threadId}`, token, { method: 'PATCH' });
}

/**
 * Turn a GitHub API subject URL (api.github.com/repos/.../issues/42) into the
 * user-facing github.com URL so the row click-through lands on the right page.
 */
export function notificationHtmlUrl(n: GitHubNotification): string {
  const subject = n.subject.url;
  if (subject) {
    const replaced = subject
      .replace('https://api.github.com/repos/', 'https://github.com/')
      .replace('/pulls/', '/pull/');
    return replaced;
  }
  return n.repository.html_url;
}

export interface DashboardCounts {
  assignedPrs: number;
  reviewRequests: number;
  mentions: number;
  unreadNotifications: number;
}

export async function fetchDashboardCounts(
  login: string,
  token: string,
): Promise<DashboardCounts> {
  const [assignedPrs, reviewRequests, mentions, unreadNotifications] = await Promise.all([
    fetchAssignedPrCount(login, token),
    fetchReviewRequestCount(login, token),
    fetchMentionCount(login, token),
    fetchUnreadNotificationCount(token),
  ]);
  return { assignedPrs, reviewRequests, mentions, unreadNotifications };
}
