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

async function githubFetch(
  path: string,
  token: string,
  init: RequestInit = {},
): Promise<Response> {
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
  if (!response.ok && response.status !== 205) {
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

interface SearchIssuesResponse {
  total_count: number;
  incomplete_results: boolean;
  items: SearchIssueItem[];
}

export interface SearchIssueItem {
  id: number;
  number: number;
  title: string;
  html_url: string;
  state: 'open' | 'closed';
  draft?: boolean;
  user: { login: string; avatar_url: string } | null;
  repository_url: string;
  updated_at: string;
  created_at: string;
  labels: Array<{ name: string; color: string }>;
  pull_request?: { html_url: string; merged_at: string | null };
  body?: string | null;
}

export function parseRepoFromUrl(repositoryUrl: string): string {
  // https://api.github.com/repos/{owner}/{repo}
  const match = repositoryUrl.match(/\/repos\/([^/]+\/[^/]+)$/);
  return match ? match[1] : repositoryUrl;
}

export async function searchIssues(
  token: string,
  query: string,
  { perPage = 30 }: { perPage?: number } = {},
): Promise<SearchIssuesResponse> {
  const params = new URLSearchParams({ q: query, per_page: String(perPage) });
  const res = await githubFetch(`/search/issues?${params.toString()}`, token);
  return (await res.json()) as SearchIssuesResponse;
}

export async function searchIssuesCount(
  token: string,
  query: string,
): Promise<number> {
  // per_page=1 minimises payload while still returning total_count.
  const data = await searchIssues(token, query, { perPage: 1 });
  return data.total_count;
}

export async function fetchAssignedPrsCount(token: string): Promise<number> {
  return searchIssuesCount(token, 'is:pr is:open assignee:@me archived:false');
}

export async function fetchReviewRequestsCount(token: string): Promise<number> {
  return searchIssuesCount(
    token,
    'is:pr is:open review-requested:@me archived:false',
  );
}

export async function fetchMentionsCount(token: string): Promise<number> {
  return searchIssuesCount(token, 'is:open mentions:@me archived:false');
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
  | string;

export type NotificationSubjectType =
  | 'PullRequest'
  | 'Issue'
  | 'Discussion'
  | 'Release'
  | 'Commit'
  | string;

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
    full_name: string;
    html_url: string;
    owner: { login: string; avatar_url: string };
  };
}

export async function fetchNotifications(
  token: string,
  { unreadOnly = true, perPage = 50 }: { unreadOnly?: boolean; perPage?: number } = {},
): Promise<GitHubNotification[]> {
  const res = await githubFetch(
    `/notifications?all=${!unreadOnly}&per_page=${perPage}`,
    token,
  );
  const data = (await res.json()) as GitHubNotification[];
  return Array.isArray(data) ? data : [];
}

export async function fetchUnreadNotificationsCount(token: string): Promise<number> {
  const items = await fetchNotifications(token, { unreadOnly: true });
  return items.length;
}

export async function markNotificationRead(
  token: string,
  threadId: string,
): Promise<void> {
  await githubFetch(`/notifications/threads/${threadId}`, token, { method: 'PATCH' });
}

/**
 * Build an html_url for a notification subject. GitHub returns API URLs on
 * the notification payload (e.g. /repos/foo/bar/pulls/1); we rewrite them to
 * their human-facing equivalents so click-through opens the actual page.
 */
export function notificationHtmlUrl(n: GitHubNotification): string {
  const { subject, repository } = n;
  if (!subject.url) return repository.html_url;
  const apiMatch = subject.url.match(/\/repos\/[^/]+\/[^/]+\/(pulls|issues)\/(\d+)/);
  if (apiMatch) {
    const kind = apiMatch[1] === 'pulls' ? 'pull' : 'issues';
    return `${repository.html_url}/${kind}/${apiMatch[2]}`;
  }
  return repository.html_url;
}

export interface AggregatedCounts {
  assignedPrs: number;
  reviewRequests: number;
  mentions: number;
  unreadNotifications: number;
}

export async function fetchAggregatedCounts(token: string): Promise<AggregatedCounts> {
  const [assignedPrs, reviewRequests, mentions, unreadNotifications] =
    await Promise.all([
      fetchAssignedPrsCount(token),
      fetchReviewRequestsCount(token),
      fetchMentionsCount(token),
      fetchUnreadNotificationsCount(token),
    ]);
  return { assignedPrs, reviewRequests, mentions, unreadNotifications };
}

// ---------- PR details ----------

export interface PullDetails {
  number: number;
  changed_files: number;
  additions: number;
  deletions: number;
  user: { login: string; avatar_url: string } | null;
  requested_reviewers: Array<{ login: string; avatar_url: string }>;
}

export async function fetchPullDetails(
  token: string,
  owner: string,
  repo: string,
  prNumber: number,
): Promise<PullDetails> {
  const res = await githubFetch(`/repos/${owner}/${repo}/pulls/${prNumber}`, token);
  return (await res.json()) as PullDetails;
}

// ---------- PR reviews ----------

export type PullReviewState =
  | 'APPROVED'
  | 'CHANGES_REQUESTED'
  | 'COMMENTED'
  | 'DISMISSED'
  | 'PENDING';

interface RawPullReview {
  id: number;
  state: PullReviewState;
  submitted_at: string | null;
  user: { login: string } | null;
}

export async function fetchPullReviews(
  token: string,
  owner: string,
  repo: string,
  prNumber: number,
): Promise<RawPullReview[]> {
  const res = await githubFetch(
    `/repos/${owner}/${repo}/pulls/${prNumber}/reviews?per_page=100`,
    token,
  );
  return (await res.json()) as RawPullReview[];
}

/**
 * Returns the latest non-comment review state across all reviewers.
 * Used to detect "Changes Requested" status on the PR list.
 */
export async function fetchLatestReviewState(
  token: string,
  owner: string,
  repo: string,
  prNumber: number,
): Promise<PullReviewState | null> {
  const reviews = await fetchPullReviews(token, owner, repo, prNumber);
  if (reviews.length === 0) return null;
  // Track the latest state per reviewer, ignoring pure COMMENTED states.
  const perReviewer = new Map<string, RawPullReview>();
  for (const review of reviews) {
    if (!review.user) continue;
    if (review.state === 'COMMENTED' || review.state === 'PENDING') continue;
    const prev = perReviewer.get(review.user.login);
    if (!prev) {
      perReviewer.set(review.user.login, review);
      continue;
    }
    const a = review.submitted_at ? Date.parse(review.submitted_at) : 0;
    const b = prev.submitted_at ? Date.parse(prev.submitted_at) : 0;
    if (a >= b) perReviewer.set(review.user.login, review);
  }
  for (const review of perReviewer.values()) {
    if (review.state === 'CHANGES_REQUESTED') return 'CHANGES_REQUESTED';
  }
  for (const review of perReviewer.values()) {
    if (review.state === 'APPROVED') return 'APPROVED';
  }
  return null;
}
