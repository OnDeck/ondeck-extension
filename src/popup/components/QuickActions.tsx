import { useState } from 'react';
import {
  addIssueReaction,
  createIssueComment,
  repoSlugFromUrl,
  submitMarkReviewed,
  type ReactionContent,
  type SearchIssueItem,
} from '../../lib/github-api';
import { recordReview } from '../../lib/stats';

interface Props {
  item: SearchIssueItem;
  token: string;
  accountId?: number;
  showMarkReviewed?: boolean;
  onAfterAction?: () => void;
}

const REACTIONS: { content: ReactionContent; glyph: string; label: string }[] = [
  { content: '+1', glyph: '👍', label: 'Thumbs up' },
  { content: 'heart', glyph: '❤', label: 'Heart' },
  { content: 'hooray', glyph: '🎉', label: 'Hooray' },
  { content: 'rocket', glyph: '🚀', label: 'Rocket' },
  { content: 'eyes', glyph: '👀', label: 'Eyes' },
];

export function QuickActions({
  item,
  token,
  accountId,
  showMarkReviewed,
  onAfterAction,
}: Props) {
  const [open, setOpen] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [reactionOpen, setReactionOpen] = useState(false);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [owner, repo] = repoSlugFromUrl(item.repository_url).split('/');

  async function run(action: () => Promise<void>) {
    if (!owner || !repo) return;
    setBusy(true);
    setError(null);
    try {
      await action();
      onAfterAction?.();
      setOpen(false);
      setReplyOpen(false);
      setReactionOpen(false);
      setReply('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="relative"
      onClick={(e) => {
        // Prevent the surrounding <a> row from navigating when the menu is used.
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Quick actions"
        className="rounded-md border border-gh-border-default px-1.5 py-0.5 text-[10px] text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-accent-emphasis"
      >
        ⋯
      </button>

      {open && (
        <div className="absolute right-0 top-full z-10 mt-1 w-48 rounded-md border border-gh-border-default bg-gh-canvas-default p-1 text-[11px] shadow-lg">
          {showMarkReviewed && (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await submitMarkReviewed(owner, repo, item.number, token);
                  if (typeof accountId === 'number') {
                    await recordReview(accountId);
                  }
                })
              }
              className="block w-full rounded-md px-2 py-1.5 text-left text-gh-fg-default hover:bg-gh-canvas-subtle disabled:opacity-60"
            >
              Mark PR as reviewed
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setReplyOpen((v) => !v);
              setReactionOpen(false);
            }}
            className="block w-full rounded-md px-2 py-1.5 text-left text-gh-fg-default hover:bg-gh-canvas-subtle"
          >
            Draft reply…
          </button>
          <button
            type="button"
            onClick={() => {
              setReactionOpen((v) => !v);
              setReplyOpen(false);
            }}
            className="block w-full rounded-md px-2 py-1.5 text-left text-gh-fg-default hover:bg-gh-canvas-subtle"
          >
            Add reaction…
          </button>

          {replyOpen && (
            <div className="mt-1 border-t border-gh-border-default pt-1">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Your reply…"
                rows={3}
                className="w-full resize-none rounded-md border border-gh-border-default bg-gh-canvas-subtle px-2 py-1 text-[11px] text-gh-fg-default outline-none focus:border-gh-accent-emphasis"
              />
              <button
                type="button"
                disabled={busy || !reply.trim()}
                onClick={() =>
                  void run(() => createIssueComment(owner, repo, item.number, reply, token))
                }
                className="mt-1 w-full rounded-md border border-gh-border-default bg-gh-canvas-subtle px-2 py-1 text-[11px] font-semibold text-gh-fg-default hover:border-gh-accent-emphasis disabled:opacity-60"
              >
                {busy ? 'Posting…' : 'Post comment'}
              </button>
            </div>
          )}

          {reactionOpen && (
            <div className="mt-1 flex items-center gap-1 border-t border-gh-border-default pt-1">
              {REACTIONS.map((r) => (
                <button
                  key={r.content}
                  type="button"
                  disabled={busy}
                  title={r.label}
                  onClick={() =>
                    void run(() =>
                      addIssueReaction(owner, repo, item.number, r.content, token),
                    )
                  }
                  className="rounded-md px-1.5 py-1 text-sm hover:bg-gh-canvas-subtle disabled:opacity-60"
                >
                  {r.glyph}
                </button>
              ))}
            </div>
          )}

          {error && (
            <div className="mt-1 rounded-md border border-gh-danger-emphasis bg-gh-canvas-subtle px-2 py-1 text-[10px] text-gh-danger-emphasis">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
