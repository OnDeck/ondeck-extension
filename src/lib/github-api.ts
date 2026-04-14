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

async function githubWrite(
  path: string,
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  body: unknown,
  token: string,
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
      body: body ? JSON.stringify(body) : undefined,
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
      `GitHub API error (${response.status})`,
      response.status,
      response.status === 401 ? 'unauthorized' : response.status === 403 ? 'forbidden' : 'other',
    );
  }
  return response;
}

// ---------- Quick actions ----------

/**
 * Submit an APPROVE review without a body. Use this for the "Mark PR as
 * reviewed" quick action on PRs where the user intends to approve.
 */
export async function approvePullRequest(
  owner: string,
  repo: string,
  pullNumber: number,
  token: string,
): Promise<void> {
  await githubWrite(`/repos/${owner}/${repo}/pulls/${pullNumber}/reviews`, 'POST', {
    event: 'APPROVE',
  }, token);
}

/**
 * Dismiss a review request (removes the current user as a requested
 * reviewer) — the "Mark PR as reviewed" soft variant for PRs where the
 * user isn't ready to approve.
 */
export async function dismissReviewRequest(
  owner: string,
  repo: string,
  pullNumber: number,
  login: string,
  token: string,
): Promise<void> {
  await githubWrite(
    `/repos/${owner}/${repo}/pulls/${pullNumber}/requested_reviewers`,
    'DELETE',
    { reviewers: [login] },
    token,
  );
}

export type Reaction =
  | '+1'
  | '-1'
  | 'laugh'
  | 'confused'
  | 'heart'
  | 'hooray'
  | 'rocket'
  | 'eyes';

export async function reactToIssueComment(
  owner: string,
  repo: string,
  commentId: number,
  content: Reaction,
  token: string,
): Promise<void> {
  await githubWrite(
    `/repos/${owner}/${repo}/issues/comments/${commentId}/reactions`,
    'POST',
    { content },
    token,
  );
}

/**
 * Save a draft reply locally (chrome.storage.local) keyed by thread id.
 * Replies are sent from the popup's reply UI and published as an issue
 * comment once the user confirms.
 */
export async function saveDraftReply(threadKey: string, body: string): Promise<void> {
  const bag = await chrome.storage.local.get('gh_workflow_drafts_v1');
  const drafts = (bag.gh_workflow_drafts_v1 as Record<string, string>) ?? {};
  drafts[threadKey] = body;
  await chrome.storage.local.set({ gh_workflow_drafts_v1: drafts });
}

export async function getDraftReply(threadKey: string): Promise<string> {
  const bag = await chrome.storage.local.get('gh_workflow_drafts_v1');
  const drafts = (bag.gh_workflow_drafts_v1 as Record<string, string>) ?? {};
  return drafts[threadKey] ?? '';
}

export async function publishIssueComment(
  owner: string,
  repo: string,
  issueNumber: number,
  body: string,
  token: string,
): Promise<void> {
  await githubWrite(
    `/repos/${owner}/${repo}/issues/${issueNumber}/comments`,
    'POST',
    { body },
    token,
  );
}
