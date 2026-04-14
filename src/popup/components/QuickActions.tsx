import { useState } from 'react';
import { getStoredAuth } from '../../lib/auth';
import {
  addIssueReaction,
  markPullRequestReviewed,
  postIssueComment,
} from '../../lib/github-api';
import { getActiveAccountId } from '../../lib/accounts';
import { recordReview } from '../../lib/analytics';

interface Props {
  owner: string;
  repo: string;
  number: number;
  isPullRequest: boolean;
  onReviewed?: () => void;
}

type Feedback =
  | { kind: 'idle' }
  | { kind: 'busy' }
  | { kind: 'success'; msg: string }
  | { kind: 'error'; msg: string };

export function QuickActions({
  owner,
  repo,
  number,
  isPullRequest,
  onReviewed,
}: Props) {
  const [feedback, setFeedback] = useState<Feedback>({ kind: 'idle' });
  const [replying, setReplying] = useState(false);
  const [draft, setDraft] = useState('');

  async function withToken(run: (token: string) => Promise<void>, success: string) {
    setFeedback({ kind: 'busy' });
    try {
      const { token } = await getStoredAuth();
      if (!token) {
        setFeedback({ kind: 'error', msg: 'You are signed out.' });
        return;
      }
      await run(token);
      setFeedback({ kind: 'success', msg: success });
    } catch (err) {
      setFeedback({
        kind: 'error',
        msg: err instanceof Error ? err.message : 'Action failed',
      });
    }
  }

  return (
    <div className="flex flex-col gap-1 border-t border-gh-border-muted pt-1">
      <div className="flex items-center gap-1">
        {isPullRequest && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              void withToken(async (t) => {
                await markPullRequestReviewed(owner, repo, number, t);
                const accountId = await getActiveAccountId();
                if (accountId) {
                  await recordReview(accountId);
                }
                onReviewed?.();
              }, 'Marked reviewed');
            }}
            disabled={feedback.kind === 'busy'}
            className="rounded-md border border-gh-border-default px-2 py-0.5 text-[10px] font-semibold text-gh-fg-muted hover:border-gh-success-emphasis hover:text-gh-success-emphasis disabled:opacity-60"
          >
            Mark reviewed
          </button>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            void withToken(
              (t) => addIssueReaction(owner, repo, number, '+1', t),
              'Reacted 👍',
            );
          }}
          disabled={feedback.kind === 'busy'}
          className="rounded-md border border-gh-border-default px-2 py-0.5 text-[10px] font-semibold text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-accent-emphasis disabled:opacity-60"
        >
          👍
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setReplying((r) => !r);
          }}
          className="rounded-md border border-gh-border-default px-2 py-0.5 text-[10px] font-semibold text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-accent-emphasis"
        >
          {replying ? 'Cancel' : 'Reply'}
        </button>
        {feedback.kind === 'success' && (
          <span className="text-[10px] text-gh-success-emphasis">{feedback.msg}</span>
        )}
        {feedback.kind === 'error' && (
          <span className="text-[10px] text-gh-danger-emphasis">{feedback.msg}</span>
        )}
      </div>
      {replying && (
        <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Draft a reply…"
            className="h-14 w-full resize-none rounded-md border border-gh-border-default bg-gh-canvas-subtle px-2 py-1 text-[11px] text-gh-fg-default placeholder:text-gh-fg-muted focus:border-gh-accent-emphasis focus:outline-none"
          />
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              disabled={feedback.kind === 'busy' || !draft.trim()}
              onClick={() =>
                void withToken(async (t) => {
                  await postIssueComment(owner, repo, number, draft.trim(), t);
                  setDraft('');
                  setReplying(false);
                }, 'Comment posted')
              }
              className="rounded-md border border-gh-border-default bg-gh-accent-emphasis px-2 py-0.5 text-[10px] font-semibold text-white hover:brightness-110 disabled:opacity-60"
            >
              {feedback.kind === 'busy' ? 'Posting…' : 'Post'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
