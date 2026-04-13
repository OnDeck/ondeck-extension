// Quick action helpers that wrap GitHub REST endpoints used by the
// productivity panel in the popup. Each helper accepts the parsed parts of
// a target URL so the UI can validate input once and reuse it across
// actions.

import { GITHUB_API_BASE, GitHubApiError } from './github-api';

export interface PullRequestRef {
  owner: string;
  repo: string;
  number: number;
}

export interface CommentRef {
  owner: string;
  repo: string;
  commentId: number;
  // Issue / PR-issue comments live under /issues/comments, while PR review
  // comments live under /pulls/comments. The reaction endpoint paths differ.
  kind: 'issue' | 'pull_review';
}

const PR_URL =
  /^https?:\/\/github\.com\/([^/\s]+)\/([^/\s]+)\/pull\/(\d+)(?:[/?#].*)?$/i;
const ISSUE_COMMENT_URL =
  /^https?:\/\/github\.com\/([^/\s]+)\/([^/\s]+)\/(?:issues|pull)\/\d+#issuecomment-(\d+)/i;
const REVIEW_COMMENT_URL =
  /^https?:\/\/github\.com\/([^/\s]+)\/([^/\s]+)\/pull\/\d+#discussion_r(\d+)/i;

export function parsePullRequestUrl(input: string): PullRequestRef | null {
  const match = input.trim().match(PR_URL);
  if (!match) return null;
  return {
    owner: match[1],
    repo: match[2],
    number: Number(match[3]),
  };
}

export function parseCommentUrl(input: string): CommentRef | null {
  const trimmed = input.trim();
  const issueMatch = trimmed.match(ISSUE_COMMENT_URL);
  if (issueMatch) {
    return {
      owner: issueMatch[1],
      repo: issueMatch[2],
      commentId: Number(issueMatch[3]),
      kind: 'issue',
    };
  }
  const reviewMatch = trimmed.match(REVIEW_COMMENT_URL);
  if (reviewMatch) {
    return {
      owner: reviewMatch[1],
      repo: reviewMatch[2],
      commentId: Number(reviewMatch[3]),
      kind: 'pull_review',
    };
  }
  return null;
}

async function jsonRequest(
  url: string,
  token: string,
  body: unknown,
  method: 'POST' | 'PATCH' | 'PUT' = 'POST',
): Promise<Response> {
  const res = await fetch(`${GITHUB_API_BASE}${url}`, {
    method,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (res.status === 401) {
    throw new GitHubApiError('Token is invalid or expired', 401, 'unauthorized');
  }
  if (res.status === 403) {
    throw new GitHubApiError('Forbidden — check token scopes', 403, 'forbidden');
  }
  if (!res.ok) {
    throw new GitHubApiError(
      `GitHub API error (${res.status})`,
      res.status,
      'other',
    );
  }
  return res;
}

/**
 * Approve a pull request as a quick "mark reviewed" action. We submit an
 * APPROVE event with no body so it shows up in the PR's review list.
 */
export async function markPrReviewed(
  token: string,
  ref: PullRequestRef,
): Promise<void> {
  await jsonRequest(
    `/repos/${ref.owner}/${ref.repo}/pulls/${ref.number}/reviews`,
    token,
    { event: 'APPROVE' },
  );
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

export async function addReactionToComment(
  token: string,
  ref: CommentRef,
  content: ReactionContent,
): Promise<void> {
  const path =
    ref.kind === 'issue'
      ? `/repos/${ref.owner}/${ref.repo}/issues/comments/${ref.commentId}/reactions`
      : `/repos/${ref.owner}/${ref.repo}/pulls/comments/${ref.commentId}/reactions`;
  await jsonRequest(path, token, { content });
}

const DRAFT_REPLIES_KEY = 'gh_workflow_draft_replies_v1';

export interface DraftReply {
  id: string;
  target: string;
  body: string;
  createdAt: number;
}

/**
 * GitHub does not have a "save draft" REST endpoint for arbitrary comments.
 * Drafts are stored locally in chrome.storage.local so the user can build
 * up a reply, close the popup, and come back to it later. The popup can
 * also publish a draft via the existing comment endpoints when the user is
 * ready.
 */
export async function listDraftReplies(): Promise<DraftReply[]> {
  const bag = await chrome.storage.local.get(DRAFT_REPLIES_KEY);
  const stored = bag[DRAFT_REPLIES_KEY] as DraftReply[] | undefined;
  return stored ?? [];
}

export async function saveDraftReply(
  draft: Omit<DraftReply, 'id' | 'createdAt'> & { id?: string },
): Promise<DraftReply> {
  const drafts = await listDraftReplies();
  const id = draft.id ?? `draft-${Date.now()}`;
  const next: DraftReply = {
    id,
    target: draft.target,
    body: draft.body,
    createdAt: Date.now(),
  };
  const filtered = drafts.filter((d) => d.id !== id);
  filtered.push(next);
  await chrome.storage.local.set({ [DRAFT_REPLIES_KEY]: filtered });
  return next;
}

export async function deleteDraftReply(id: string): Promise<void> {
  const drafts = await listDraftReplies();
  await chrome.storage.local.set({
    [DRAFT_REPLIES_KEY]: drafts.filter((d) => d.id !== id),
  });
}

/**
 * Publish a saved draft to the linked PR or issue. We accept either a PR
 * URL (post a top-level issue comment) or a comment URL (post a reply to
 * the same thread).
 */
export async function publishDraftReply(
  token: string,
  draft: DraftReply,
): Promise<void> {
  const pr = parsePullRequestUrl(draft.target);
  if (pr) {
    await jsonRequest(
      `/repos/${pr.owner}/${pr.repo}/issues/${pr.number}/comments`,
      token,
      { body: draft.body },
    );
    return;
  }
  const comment = parseCommentUrl(draft.target);
  if (!comment) {
    throw new GitHubApiError(
      'Draft target must be a PR or comment URL',
      0,
      'other',
    );
  }
  // Replies always live under issues/comments since GitHub's review-thread
  // reply endpoint requires the original review id which we don't have.
  await jsonRequest(
    `/repos/${comment.owner}/${comment.repo}/issues/${comment.commentId}/comments`,
    token,
    { body: draft.body },
  );
}
