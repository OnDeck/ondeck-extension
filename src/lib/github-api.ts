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

// ---------- Search + notifications helpers ----------

export interface SearchIssueItem {
  id: number;
  number: number;
  title: string;
  body?: string | null;
  html_url: string;
  repository_url: string;
  state: 'open' | 'closed';
  draft?: boolean;
  created_at: string;
  updated_at: string;
  user: { login: string; avatar_url: string } | null;
  labels: { name: string; color: string }[];
  pull_request?: { url: string; html_url: string; draft?: boolean };
}

interface SearchIssuesResponse {
  total_count: number;
  incomplete_results: boolean;
  items: SearchIssueItem[];
}

export interface GitHubPrItem {
  id: number;
  number: number;
  title: string;
  body: string | null;
  htmlUrl: string;
  repo: string;
  org: string;
  isPullRequest: boolean;
  state: 'open' | 'closed';
  draft: boolean;
  createdAt: string;
  updatedAt: string;
  author: { login: string; avatarUrl: string } | null;
  labels: { name: string; color: string }[];
}

function extractRepo(item: SearchIssueItem): { org: string; repo: string } {
  // repository_url is of the form https://api.github.com/repos/:owner/:repo
  const parts = item.repository_url.split('/');
  return {
    org: parts[parts.length - 2] ?? '',
    repo: parts[parts.length - 1] ?? '',
  };
}

function toPrItem(item: SearchIssueItem): GitHubPrItem {
  const { org, repo } = extractRepo(item);
  return {
    id: item.id,
    number: item.number,
    title: item.title,
    body: item.body ?? null,
    htmlUrl: item.html_url,
    org,
    repo,
    isPullRequest: Boolean(item.pull_request),
    state: item.state,
    draft: Boolean(item.draft ?? item.pull_request?.draft),
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    author: item.user ? { login: item.user.login, avatarUrl: item.user.avatar_url } : null,
    labels: item.labels ?? [],
  };
}

/**
 * Run a GitHub issue search and return the (mapped) first page of
 * results. Used by the assigned / reviews / mentions tabs.
 */
export async function searchIssues(
  token: string,
  query: string,
  perPage = 30,
): Promise<GitHubPrItem[]> {
  const params = new URLSearchParams({
    q: query,
    per_page: String(perPage),
    sort: 'updated',
    order: 'desc',
  });
  const res = await githubFetch(`/search/issues?${params.toString()}`, token);
  const data = (await res.json()) as SearchIssuesResponse;
  return (data.items ?? []).map(toPrItem);
}

/**
 * Run a GitHub issue search and return the total count. The caller is
 * responsible for constructing a valid search qualifier string.
 */
export async function searchIssuesCount(token: string, query: string): Promise<number> {
  const params = new URLSearchParams({ q: query, per_page: '1' });
  const res = await githubFetch(`/search/issues?${params.toString()}`, token);
  const data = (await res.json()) as SearchIssuesResponse;
  return data.total_count ?? 0;
}

export interface DashboardCounts {
  assignedPrs: number;
  reviewRequests: number;
  mentions: number;
  notifications: number;
}

/**
 * Fetch counts for the four dashboard rows in parallel. Each individual
 * request is awaited with Promise.allSettled so one failure doesn't sink
 * the entire dashboard — failed fetches surface as 0 and the caller can
 * decide how to render partial failure.
 */
export async function fetchDashboardCounts(
  token: string,
  login: string,
): Promise<DashboardCounts> {
  const assignedQuery = `is:pr is:open assignee:${login}`;
  const reviewQuery = `is:pr is:open review-requested:${login}`;
  const mentionsQuery = `is:open mentions:${login}`;

  const [assigned, reviews, mentions, notifications] = await Promise.all([
    searchIssuesCount(token, assignedQuery),
    searchIssuesCount(token, reviewQuery),
    searchIssuesCount(token, mentionsQuery),
    fetchUnreadNotificationsCount(token),
  ]);

  return {
    assignedPrs: assigned,
    reviewRequests: reviews,
    mentions,
    notifications,
  };
}

interface PrDetailResponse {
  changed_files: number;
  additions: number;
  deletions: number;
}

export interface PrMetrics {
  changedFiles: number;
  additions: number;
  deletions: number;
}

/**
 * Fetch per-PR metrics (files changed, additions, deletions) used by
 * the Reviews tab to show reviewer effort at a glance.
 */
export async function fetchPrMetrics(
  token: string,
  org: string,
  repo: string,
  prNumber: number,
): Promise<PrMetrics | null> {
  try {
    const res = await githubFetch(`/repos/${org}/${repo}/pulls/${prNumber}`, token);
    const data = (await res.json()) as PrDetailResponse;
    return {
      changedFiles: data.changed_files ?? 0,
      additions: data.additions ?? 0,
      deletions: data.deletions ?? 0,
    };
  } catch {
    return null;
  }
}

export type PrReviewState = 'approved' | 'changes_requested' | 'commented' | 'pending' | null;

interface PrReviewResponse {
  state: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'DISMISSED' | 'PENDING';
  submitted_at: string | null;
  user: { login: string } | null;
}

/**
 * Fetch the latest non-dismissed review state for a PR. Returns
 * 'changes_requested' if any reviewer most-recently requested changes
 * and those changes haven't been superseded by an approval — good
 * enough for the "needs attention" badge on list rows.
 */
export async function fetchPrReviewState(
  token: string,
  org: string,
  repo: string,
  prNumber: number,
): Promise<PrReviewState> {
  try {
    const res = await githubFetch(
      `/repos/${org}/${repo}/pulls/${prNumber}/reviews?per_page=100`,
      token,
    );
    const reviews = (await res.json()) as PrReviewResponse[];
    // Collapse to the most recent review per reviewer.
    const latest = new Map<string, PrReviewResponse>();
    for (const r of reviews) {
      if (r.state === 'DISMISSED' || r.state === 'PENDING') continue;
      const key = r.user?.login ?? '__anon__';
      latest.set(key, r);
    }
    const states = Array.from(latest.values()).map((r) => r.state);
    if (states.includes('CHANGES_REQUESTED')) return 'changes_requested';
    if (states.includes('APPROVED')) return 'approved';
    if (states.includes('COMMENTED')) return 'commented';
    return null;
  } catch {
    return null;
  }
}

/**
 * Count unread notifications. The /notifications endpoint paginates, so
 * we walk pages until exhausted (capped at 10 pages / 500 notifications
 * to avoid runaway loops for very noisy inboxes).
 */
export async function fetchUnreadNotificationsCount(token: string): Promise<number> {
  const perPage = 50;
  const maxPages = 10;
  let total = 0;
  for (let page = 1; page <= maxPages; page += 1) {
    const res = await githubFetch(
      `/notifications?all=false&per_page=${perPage}&page=${page}`,
      token,
    );
    const items = (await res.json()) as unknown[];
    total += items.length;
    if (items.length < perPage) break;
  }
  return total;
}
