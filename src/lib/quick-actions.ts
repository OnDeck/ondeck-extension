// Quick action helpers: mark-reviewed, reactions, draft replies.
// These call the GitHub API directly and persist drafts in
// chrome.storage.local.

import { GitHubApiError } from './github-api';

const API = 'https://api.github.com';

const DRAFT_PREFIX = 'gh_draft_reply_';

async function apiCall(
  token: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH',
  path: string,
  body?: unknown,
): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  let response: Response;
  try {
    response = await fetch(`${API}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (err) {
    throw new GitHubApiError(
      err instanceof Error ? err.message : 'Network error',
      0,
      'network',
    );
  }
  if (!response.ok) {
    throw new GitHubApiError(
      `GitHub API error (${response.status})`,
      response.status,
      response.status === 401 ? 'unauthorized' : response.status === 403 ? 'forbidden' : 'other',
    );
  }
  return response;
}

export async function markPullRequestReviewed(
  token: string,
  repoFullName: string,
  pullNumber: number,
): Promise<void> {
  await apiCall(token, 'POST', `/repos/${repoFullName}/pulls/${pullNumber}/reviews`, {
    event: 'COMMENT',
    body: 'Reviewed via GitHub Workflow Assistant.',
  });
}

export type ReactionContent =
  | '+1'
  | '-1'
  | 'laugh'
  | 'confused'
  | 'heart'
  | 'hooray'
  | 'rocket'
  | 'eyes';

export async function addCommentReaction(
  token: string,
  repoFullName: string,
  commentId: number,
  content: ReactionContent,
): Promise<void> {
  await apiCall(
    token,
    'POST',
    `/repos/${repoFullName}/issues/comments/${commentId}/reactions`,
    { content },
  );
}

export async function saveDraftReply(threadId: string, body: string): Promise<void> {
  await chrome.storage.local.set({ [DRAFT_PREFIX + threadId]: body });
}

export async function loadDraftReply(threadId: string): Promise<string> {
  const bag = await chrome.storage.local.get(DRAFT_PREFIX + threadId);
  return (bag[DRAFT_PREFIX + threadId] as string | undefined) ?? '';
}

export async function deleteDraftReply(threadId: string): Promise<void> {
  await chrome.storage.local.remove(DRAFT_PREFIX + threadId);
}
