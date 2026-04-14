import { useState } from 'react';
import { getStoredAuth } from '../../lib/auth';
import {
  addIssueReaction,
  postIssueComment,
  submitPrReview,
} from '../../lib/github-api';

interface Props {
  org: string;
  repo: string;
  number: number;
  isPullRequest: boolean;
  onReviewed?: () => void;
}

type ActionStatus = 'idle' | 'busy' | 'done' | 'error';

/**
 * Inline quick-action strip for PR / issue list rows. Supports:
 *   - Mark PR as reviewed (posts an empty COMMENT review — removes
 *     the PR from your review-requested queue without being opinionated).
 *   - 👍 reaction (posts a +1 to the issue or PR body).
 *   - Draft reply (small inline textarea that POSTs a comment).
 */
export function QuickActions({ org, repo, number, isPullRequest, onReviewed }: Props) {
  const [reviewState, setReviewState] = useState<ActionStatus>('idle');
  const [reactState, setReactState] = useState<ActionStatus>('idle');
  const [replyOpen, setReplyOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [replyState, setReplyState] = useState<ActionStatus>('idle');

  const run = async (
    setState: (s: ActionStatus) => void,
    fn: (token: string) => Promise<boolean>,
  ) => {
    setState('busy');
    try {
      const { token } = await getStoredAuth();
      if (!token) {
        setState('error');
        return;
      }
      const ok = await fn(token);
      setState(ok ? 'done' : 'error');
    } catch {
      setState('error');
    }
  };

  return (
    <div
      className="flex flex-wrap items-center gap-1 pt-1"
      onClick={(e) => e.stopPropagation()}
    >
      {isPullRequest && (
        <button
          type="button"
          disabled={reviewState === 'busy' || reviewState === 'done'}
          onClick={() =>
            void run(
              (s) => {
                setReviewState(s);
                if (s === 'done') onReviewed?.();
              },
              (token) => submitPrReview(token, org, repo, number, 'COMMENT'),
            )
          }
          className="rounded-md border border-gh-border-default px-1.5 py-0.5 text-[10px] text-gh-fg-muted hover:border-gh-success-emphasis hover:text-gh-success-emphasis disabled:opacity-60"
          title="Mark as reviewed"
        >
          {reviewState === 'done' ? '✓ Reviewed' : reviewState === 'busy' ? '…' : 'Mark reviewed'}
        </button>
      )}
      <button
        type="button"
        disabled={reactState === 'busy' || reactState === 'done'}
        onClick={() =>
          void run(setReactState, (token) =>
            addIssueReaction(token, org, repo, number, '+1'),
          )
        }
        className="rounded-md border border-gh-border-default px-1.5 py-0.5 text-[10px] text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-fg-default disabled:opacity-60"
        title="Add 👍 reaction"
      >
        {reactState === 'done' ? '👍✓' : '👍'}
      </button>
      <button
        type="button"
        onClick={() => setReplyOpen((v) => !v)}
        className="rounded-md border border-gh-border-default px-1.5 py-0.5 text-[10px] text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-fg-default"
        title="Draft reply"
      >
        {replyOpen ? '–' : 'Reply'}
      </button>

      {replyOpen && (
        <div className="mt-1 flex w-full flex-col gap-1">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Write a quick reply…"
            rows={2}
            className="w-full resize-none rounded-md border border-gh-border-default bg-gh-canvas-default px-2 py-1 text-[11px] text-gh-fg-default outline-none focus:border-gh-accent-emphasis"
          />
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={replyState === 'busy' || draft.trim().length === 0}
              onClick={() =>
                void run(setReplyState, async (token) => {
                  const ok = await postIssueComment(token, org, repo, number, draft.trim());
                  if (ok) {
                    setDraft('');
                    setReplyOpen(false);
                  }
                  return ok;
                })
              }
              className="rounded-md border border-gh-border-default bg-gh-accent-emphasis px-2 py-0.5 text-[10px] font-semibold text-white hover:brightness-110 disabled:opacity-60"
            >
              {replyState === 'busy' ? 'Sending…' : 'Send'}
            </button>
            {replyState === 'error' && (
              <span className="text-[10px] text-gh-danger-emphasis">Failed</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
