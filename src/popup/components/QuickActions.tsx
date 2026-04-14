import { useEffect, useState } from 'react';
import {
  approvePullRequest,
  dismissReviewRequest,
  getDraftReply,
  publishIssueComment,
  reactToIssueComment,
  saveDraftReply,
  type Reaction,
} from '../../lib/github-api';
import { getStoredAuth } from '../../lib/auth';

interface TargetPr {
  owner: string;
  repo: string;
  number: number;
}

interface TargetComment {
  owner: string;
  repo: string;
  commentId: number;
  issueNumber: number;
}

interface Props {
  /** PR to target with "Mark as reviewed" / "Dismiss review". */
  pr?: TargetPr;
  /** Comment to react to and reply from. */
  comment?: TargetComment;
  /** Stable key used to persist the draft across popup opens. */
  draftKey: string;
}

const REACTIONS: Reaction[] = ['+1', 'heart', 'hooray', 'rocket', 'eyes'];

function emojiFor(reaction: Reaction): string {
  switch (reaction) {
    case '+1':
      return '👍';
    case '-1':
      return '👎';
    case 'laugh':
      return '😄';
    case 'confused':
      return '😕';
    case 'heart':
      return '❤';
    case 'hooray':
      return '🎉';
    case 'rocket':
      return '🚀';
    case 'eyes':
      return '👀';
  }
}

export function QuickActions({ pr, comment, draftKey }: Props) {
  const [draft, setDraft] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      setDraft(await getDraftReply(draftKey));
    })();
  }, [draftKey]);

  const run = async (label: string, fn: (token: string, login: string) => Promise<void>) => {
    setBusy(true);
    setStatus(null);
    try {
      const { token, viewer } = await getStoredAuth();
      if (!token || !viewer) throw new Error('Not signed in');
      await fn(token, viewer.login);
      setStatus(`${label} ✓`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : `${label} failed`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 rounded-md border border-gh-border-default bg-gh-canvas-subtle p-2 text-xs">
      {pr && (
        <div className="flex gap-1">
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              run('Approved', (token) => approvePullRequest(pr.owner, pr.repo, pr.number, token))
            }
            className="flex-1 rounded-md border border-gh-border-default bg-gh-success-emphasis/10 px-2 py-1 text-gh-success-emphasis hover:border-gh-success-emphasis disabled:opacity-60"
          >
            Mark reviewed
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              run('Dismissed', (token, login) =>
                dismissReviewRequest(pr.owner, pr.repo, pr.number, login, token),
              )
            }
            className="flex-1 rounded-md border border-gh-border-default px-2 py-1 text-gh-fg-muted hover:border-gh-accent-emphasis disabled:opacity-60"
          >
            Dismiss
          </button>
        </div>
      )}

      {comment && (
        <div className="flex flex-wrap gap-1">
          {REACTIONS.map((r) => (
            <button
              key={r}
              type="button"
              disabled={busy}
              title={r}
              onClick={() =>
                run(`Reacted ${r}`, (token) =>
                  reactToIssueComment(comment.owner, comment.repo, comment.commentId, r, token),
                )
              }
              className="rounded-md border border-gh-border-default bg-gh-canvas-default px-2 py-0.5 hover:border-gh-accent-emphasis disabled:opacity-60"
            >
              {emojiFor(r)}
            </button>
          ))}
        </div>
      )}

      {comment && (
        <div className="flex flex-col gap-1">
          <textarea
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              void saveDraftReply(draftKey, e.target.value);
            }}
            rows={3}
            placeholder="Draft reply…"
            className="w-full rounded-md border border-gh-border-default bg-gh-canvas-default p-1.5 text-xs text-gh-fg-default placeholder:text-gh-fg-muted focus:border-gh-accent-emphasis focus:outline-none"
          />
          <button
            type="button"
            disabled={busy || !draft.trim()}
            onClick={() =>
              run('Published', async (token) => {
                await publishIssueComment(
                  comment.owner,
                  comment.repo,
                  comment.issueNumber,
                  draft,
                  token,
                );
                await saveDraftReply(draftKey, '');
                setDraft('');
              })
            }
            className="self-end rounded-md border border-gh-border-default bg-gh-accent-emphasis px-2 py-1 text-xs font-semibold text-white hover:brightness-110 disabled:opacity-60"
          >
            {busy ? 'Working…' : 'Send reply'}
          </button>
        </div>
      )}

      {status && <div className="text-[11px] text-gh-fg-muted">{status}</div>}
    </div>
  );
}
