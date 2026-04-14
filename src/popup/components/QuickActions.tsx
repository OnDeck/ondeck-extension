import { useEffect, useState } from 'react';
import { getStoredAuth } from '../../lib/auth';
import {
  deleteDraftReply,
  getDraftReply,
  markPullRequestReviewed,
  reactToComment,
  saveDraftReply,
  type Reaction,
} from '../../lib/github-actions';

interface Props {
  /** "owner/repo" form. */
  repo: string;
  issueNumber: number;
  /** Optional comment to react to. */
  commentId?: number;
  onClose?: () => void;
}

const REACTIONS: Reaction[] = ['+1', 'heart', 'rocket', 'eyes', 'laugh', 'hooray'];
const REACTION_GLYPH: Record<Reaction, string> = {
  '+1': '👍',
  '-1': '👎',
  laugh: '😄',
  hooray: '🎉',
  confused: '😕',
  heart: '❤',
  rocket: '🚀',
  eyes: '👀',
};

export function QuickActions({ repo, issueNumber, commentId, onClose }: Props) {
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await getDraftReply(repo, issueNumber);
      if (!cancelled && stored) setDraft(stored.body);
    })();
    return () => {
      cancelled = true;
    };
  }, [repo, issueNumber]);

  const withToken = async <T,>(
    label: string,
    op: (token: string) => Promise<T>,
  ): Promise<void> => {
    setBusy(label);
    setStatus(null);
    try {
      const { token } = await getStoredAuth();
      if (!token) throw new Error('Not signed in');
      await op(token);
      setStatus(`${label} ✓`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : `${label} failed`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-2 rounded-md border border-gh-border-default bg-gh-canvas-subtle p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gh-fg-default">Quick actions</h3>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-[11px] text-gh-fg-muted hover:text-gh-fg-default"
          >
            Close
          </button>
        )}
      </div>
      <div className="text-[10px] text-gh-fg-muted">
        {repo} #{issueNumber}
      </div>

      <button
        type="button"
        disabled={busy !== null}
        onClick={() =>
          void withToken('Marked reviewed', (token) =>
            markPullRequestReviewed(repo, issueNumber, token),
          )
        }
        className="rounded-md border border-gh-border-default bg-gh-canvas-default px-2 py-1 text-[11px] text-gh-fg-default hover:border-gh-accent-emphasis disabled:opacity-60"
      >
        {busy === 'Marked reviewed' ? 'Submitting…' : 'Mark PR as reviewed'}
      </button>

      {commentId !== undefined && (
        <div className="flex items-center gap-1">
          {REACTIONS.map((r) => (
            <button
              key={r}
              type="button"
              disabled={busy !== null}
              onClick={() =>
                void withToken(`Reacted ${r}`, (token) =>
                  reactToComment(repo, commentId, r, token),
                )
              }
              title={`React with ${r}`}
              className="rounded-md border border-gh-border-default bg-gh-canvas-default px-1.5 py-1 text-sm hover:border-gh-accent-emphasis disabled:opacity-60"
            >
              {REACTION_GLYPH[r]}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-semibold text-gh-fg-muted">Draft reply</label>
        <textarea
          rows={3}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Write a quick reply (saved locally)…"
          className="rounded-md border border-gh-border-default bg-gh-canvas-default px-2 py-1 text-[11px] text-gh-fg-default outline-none placeholder:text-gh-fg-muted focus:border-gh-accent-emphasis"
        />
        <div className="flex gap-2">
          <button
            type="button"
            disabled={!draft.trim()}
            onClick={() => void saveDraftReply(repo, issueNumber, draft)}
            className="rounded-md border border-gh-border-default bg-gh-canvas-default px-2 py-1 text-[11px] text-gh-fg-default hover:border-gh-accent-emphasis disabled:opacity-60"
          >
            Save draft
          </button>
          <button
            type="button"
            onClick={() => {
              setDraft('');
              void deleteDraftReply(repo, issueNumber);
            }}
            className="rounded-md border border-gh-border-default bg-gh-canvas-default px-2 py-1 text-[11px] text-gh-fg-muted hover:border-gh-danger-emphasis hover:text-gh-danger-emphasis"
          >
            Discard
          </button>
        </div>
      </div>

      {status && (
        <div className="text-[10px] text-gh-fg-muted">{status}</div>
      )}
    </div>
  );
}
