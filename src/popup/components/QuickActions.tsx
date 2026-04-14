import { useState } from 'react';
import { getActiveAccountId } from '../../lib/accounts';
import { incrementReviewed } from '../../lib/analytics';
import { getStoredAuth } from '../../lib/auth';
import {
  addIssueReaction,
  markPullRequestReviewed,
  postIssueComment,
} from '../../lib/github-api';

interface Props {
  owner: string;
  repo: string;
  number: number;
  isPr: boolean;
}

type ActionState =
  | { kind: 'idle' }
  | { kind: 'busy' }
  | { kind: 'done'; message: string }
  | { kind: 'error'; message: string };

async function withToken<T>(fn: (token: string) => Promise<T>): Promise<T> {
  const { token } = await getStoredAuth();
  if (!token) throw new Error('Not signed in');
  return fn(token);
}

export function QuickActions({ owner, repo, number, isPr }: Props) {
  const [state, setState] = useState<ActionState>({ kind: 'idle' });
  const [replyOpen, setReplyOpen] = useState(false);
  const [reply, setReply] = useState('');

  const run = async (label: string, fn: () => Promise<void>) => {
    setState({ kind: 'busy' });
    try {
      await fn();
      setState({ kind: 'done', message: `${label} ✓` });
    } catch (err) {
      setState({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Failed',
      });
    }
  };

  const busy = state.kind === 'busy';

  return (
    <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px]">
      {isPr && (
        <button
          type="button"
          disabled={busy}
          onClick={(e) => {
            e.stopPropagation();
            void run('Reviewed', async () => {
              await withToken((t) => markPullRequestReviewed(owner, repo, number, t));
              const accountId = await getActiveAccountId();
              if (accountId) await incrementReviewed(accountId);
            });
          }}
          className="rounded-md border border-gh-border-default px-1.5 py-0.5 text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-accent-emphasis disabled:opacity-60"
        >
          Mark reviewed
        </button>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={(e) => {
          e.stopPropagation();
          void run('Reaction', () =>
            withToken((t) => addIssueReaction(owner, repo, number, '+1', t)),
          );
        }}
        className="rounded-md border border-gh-border-default px-1.5 py-0.5 text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-accent-emphasis disabled:opacity-60"
      >
        👍
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={(e) => {
          e.stopPropagation();
          setReplyOpen((open) => !open);
        }}
        className="rounded-md border border-gh-border-default px-1.5 py-0.5 text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-accent-emphasis disabled:opacity-60"
      >
        Reply
      </button>
      {state.kind === 'done' && <span className="text-gh-success-emphasis">{state.message}</span>}
      {state.kind === 'error' && (
        <span className="text-gh-danger-emphasis">{state.message}</span>
      )}

      {replyOpen && (
        <div
          className="mt-1 flex w-full flex-col gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            rows={2}
            placeholder="Draft reply…"
            className="w-full rounded-md border border-gh-border-default bg-gh-canvas-subtle px-2 py-1 text-[11px] text-gh-fg-default outline-none focus:border-gh-accent-emphasis"
          />
          <button
            type="button"
            disabled={busy || !reply.trim()}
            onClick={() =>
              void run('Posted', async () => {
                await withToken((t) => postIssueComment(owner, repo, number, reply, t));
                setReply('');
                setReplyOpen(false);
              })
            }
            className="self-end rounded-md border border-gh-border-default bg-gh-accent-emphasis px-2 py-0.5 text-[10px] font-semibold text-white disabled:opacity-60"
          >
            Post
          </button>
        </div>
      )}
    </div>
  );
}
