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
  init: { method?: string; body?: unknown; accept?: string } = {},
): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(`${GITHUB_API_BASE}${path}`, {
      method: init.method ?? 'GET',
      headers: {
        Accept: init.accept ?? 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
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

// ---------- Quick actions ----------

export type ReviewEvent = 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT';

export type ReactionContent =
  | '+1'
  | '-1'
  | 'laugh'
  | 'confused'
  | 'heart'
  | 'hooray'
  | 'rocket'
  | 'eyes';

/**
 * Submit a review on a pull request. Used by the "Mark as reviewed" quick
 * action — defaults to a COMMENT review with no body, which marks the PR
 * as reviewed without approving or blocking it.
 */
export async function submitPullRequestReview(
  token: string,
  org: string,
  repo: string,
  pullNumber: number,
  options: { event?: ReviewEvent; body?: string } = {},
): Promise<void> {
  await githubFetch(`/repos/${org}/${repo}/pulls/${pullNumber}/reviews`, token, {
    method: 'POST',
    body: {
      event: options.event ?? 'COMMENT',
      body: options.body ?? 'Reviewed via GitHub Workflow Assistant',
    },
  });
}

/**
 * Add an emoji reaction to an issue / PR comment.
 */
export async function addCommentReaction(
  token: string,
  org: string,
  repo: string,
  commentId: number,
  reaction: ReactionContent,
): Promise<void> {
  await githubFetch(
    `/repos/${org}/${repo}/issues/comments/${commentId}/reactions`,
    token,
    {
      method: 'POST',
      accept: 'application/vnd.github.squirrel-girl-preview+json',
      body: { content: reaction },
    },
  );
}

/**
 * Create a reply to a pull request review comment. The new comment is
 * attached to the same review thread as `inReplyTo`.
 */
export async function createPullRequestCommentReply(
  token: string,
  org: string,
  repo: string,
  pullNumber: number,
  inReplyTo: number,
  body: string,
): Promise<void> {
  await githubFetch(`/repos/${org}/${repo}/pulls/${pullNumber}/comments`, token, {
    method: 'POST',
    body: { body, in_reply_to: inReplyTo },
  });
}
