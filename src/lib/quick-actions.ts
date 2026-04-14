// Quick action helpers: personal "reviewed" tracking, comment reactions,
// and persisted draft replies.
//
// Note: "Mark PR as reviewed" here is a local, per-user marker — there is
// no corresponding GitHub API concept. Submitting an actual PR review is a
// separate, more involved flow (POST /repos/{owner}/{repo}/pulls/{n}/reviews)
// and is not covered by this utility.

import { GitHubApiError, GITHUB_API_BASE } from './github-api';

const REVIEWED_KEY = 'gh_workflow_reviewed_prs_v1';
const DRAFT_PREFIX = 'gh_workflow_draft_reply_';

export interface ReviewedMarker {
  repo: string;
  number: number;
  markedAt: string; // ISO
}

export async function getReviewedMarkers(): Promise<ReviewedMarker[]> {
  const bag = await chrome.storage.local.get(REVIEWED_KEY);
  const arr = bag[REVIEWED_KEY] as ReviewedMarker[] | undefined;
  return arr ?? [];
}

export async function markPrReviewed(repo: string, number: number): Promise<void> {
  const existing = await getReviewedMarkers();
  const without = existing.filter((m) => !(m.repo === repo && m.number === number));
  const next: ReviewedMarker[] = [
    ...without,
    { repo, number, markedAt: new Date().toISOString() },
  ];
  await chrome.storage.local.set({ [REVIEWED_KEY]: next.slice(-500) });
}

export async function unmarkPrReviewed(repo: string, number: number): Promise<void> {
  const existing = await getReviewedMarkers();
  const next = existing.filter((m) => !(m.repo === repo && m.number === number));
  await chrome.storage.local.set({ [REVIEWED_KEY]: next });
}

export async function isPrReviewed(repo: string, number: number): Promise<boolean> {
  const markers = await getReviewedMarkers();
  return markers.some((m) => m.repo === repo && m.number === number);
}

// ---------- Reactions ----------

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
 * Adds a reaction to an issue comment. Uses the GitHub REST API:
 *   POST /repos/{owner}/{repo}/issues/comments/{comment_id}/reactions
 */
export async function addCommentReaction(
  repo: string,
  commentId: number,
  content: ReactionContent,
  token: string,
): Promise<void> {
  const response = await fetch(
    `${GITHUB_API_BASE}/repos/${repo}/issues/comments/${commentId}/reactions`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({ content }),
    },
  );
  if (response.status === 401) {
    throw new GitHubApiError('Token is invalid or expired', 401, 'unauthorized');
  }
  if (response.status === 403) {
    throw new GitHubApiError('Forbidden — check token scopes', 403, 'forbidden');
  }
  // 200 (existing) or 201 (new) are both success per GitHub docs.
  if (!response.ok) {
    throw new GitHubApiError(
      `Failed to add reaction (${response.status})`,
      response.status,
      'other',
    );
  }
}

// ---------- Draft replies ----------

function draftKey(repo: string, number: number): string {
  return `${DRAFT_PREFIX}${repo}#${number}`;
}

export async function saveDraftReply(
  repo: string,
  number: number,
  body: string,
): Promise<void> {
  const key = draftKey(repo, number);
  if (!body.trim()) {
    await chrome.storage.local.remove(key);
    return;
  }
  await chrome.storage.local.set({ [key]: { body, savedAt: Date.now() } });
}

export async function loadDraftReply(
  repo: string,
  number: number,
): Promise<string | null> {
  const key = draftKey(repo, number);
  const bag = await chrome.storage.local.get(key);
  const entry = bag[key] as { body?: string } | undefined;
  return entry?.body ?? null;
}

export async function deleteDraftReply(repo: string, number: number): Promise<void> {
  await chrome.storage.local.remove(draftKey(repo, number));
}
