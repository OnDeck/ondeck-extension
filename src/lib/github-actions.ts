import { GITHUB_API_BASE, GitHubApiError } from './github-api';

async function ghFetch(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(`${GITHUB_API_BASE}${path}`, {
      ...init,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(init?.headers ?? {}),
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
    throw new GitHubApiError(`GitHub API error (${res.status})`, res.status, 'other');
  }
  return res;
}

export type Reaction =
  | '+1'
  | '-1'
  | 'laugh'
  | 'hooray'
  | 'confused'
  | 'heart'
  | 'rocket'
  | 'eyes';

/**
 * Submit an APPROVE review to mark the PR as reviewed by the user.
 * Equivalent to clicking "Approve" in the GitHub PR review UI.
 */
export async function markPullRequestReviewed(
  repoFullName: string,
  number: number,
  token: string,
  body = '',
): Promise<void> {
  await ghFetch(`/repos/${repoFullName}/pulls/${number}/reviews`, token, {
    method: 'POST',
    body: JSON.stringify({ event: 'APPROVE', body }),
  });
}

/**
 * Add a reaction emoji to an issue comment.
 */
export async function reactToComment(
  repoFullName: string,
  commentId: number,
  reaction: Reaction,
  token: string,
): Promise<void> {
  await ghFetch(
    `/repos/${repoFullName}/issues/comments/${commentId}/reactions`,
    token,
    {
      method: 'POST',
      body: JSON.stringify({ content: reaction }),
    },
  );
}

/**
 * Persist a draft reply locally so the user can iterate before sending it.
 * Drafts are scoped per (repo, issue) and stored in chrome.storage.local.
 */
export const DRAFTS_KEY = 'gh_workflow_drafts_v1';

export interface DraftReply {
  repo: string;
  issueNumber: number;
  body: string;
  updatedAt: number;
}

function draftKey(repo: string, issueNumber: number): string {
  return `${repo}#${issueNumber}`;
}

export async function saveDraftReply(
  repo: string,
  issueNumber: number,
  body: string,
): Promise<void> {
  const bag = await chrome.storage.local.get(DRAFTS_KEY);
  const drafts = (bag[DRAFTS_KEY] as Record<string, DraftReply> | undefined) ?? {};
  drafts[draftKey(repo, issueNumber)] = {
    repo,
    issueNumber,
    body,
    updatedAt: Date.now(),
  };
  await chrome.storage.local.set({ [DRAFTS_KEY]: drafts });
}

export async function getDraftReply(
  repo: string,
  issueNumber: number,
): Promise<DraftReply | null> {
  const bag = await chrome.storage.local.get(DRAFTS_KEY);
  const drafts = (bag[DRAFTS_KEY] as Record<string, DraftReply> | undefined) ?? {};
  return drafts[draftKey(repo, issueNumber)] ?? null;
}

export async function deleteDraftReply(
  repo: string,
  issueNumber: number,
): Promise<void> {
  const bag = await chrome.storage.local.get(DRAFTS_KEY);
  const drafts = (bag[DRAFTS_KEY] as Record<string, DraftReply> | undefined) ?? {};
  delete drafts[draftKey(repo, issueNumber)];
  await chrome.storage.local.set({ [DRAFTS_KEY]: drafts });
}
