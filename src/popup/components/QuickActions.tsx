import { useState } from 'react';
import { getStoredAuth } from '../../lib/auth';
import {
  addIssueReaction,
  createIssueComment,
  parseRepoFromUrl,
  type IssueSearchItem,
  type ReactionContent,
} from '../../lib/github-api';

interface Props {
  item: IssueSearchItem;
  onMarkReviewed?: (item: IssueSearchItem) => void;
}

type BusyKind = 'idle' | 'react' | 'reply' | 'done';

export function QuickActions({ item, onMarkReviewed }: Props) {
  const [busy, setBusy] = useState<BusyKind>('idle');
  const [error, setError] = useState<string | null>(null);
  const [replyOpen, setReplyOpen] = useState(false);
  const [draft, setDraft] = useState('');

  const coords = parseRepoFromUrl(item.repository_url);

  const react = async (content: ReactionContent) => {
    if (!coords) return;
    setBusy('react');
    setError(null);
    try {
      const { token } = await getStoredAuth();
      if (!token) throw new Error('Not signed in');
      await addIssueReaction(token, coords.owner, coords.repo, item.number, content);
      setBusy('done');
      setTimeout(() => setBusy('idle'), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reaction failed');
      setBusy('idle');
    }
  };

  const submitReply = async () => {
    if (!coords || !draft.trim()) return;
    setBusy('reply');
    setError(null);
    try {
      const { token } = await getStoredAuth();
      if (!token) throw new Error('Not signed in');
      await createIssueComment(token, coords.owner, coords.repo, item.number, draft.trim());
      setDraft('');
      setReplyOpen(false);
      setBusy('done');
      setTimeout(() => setBusy('idle'), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reply failed');
      setBusy('idle');
    }
  };

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <div className="mt-2 flex items-center gap-1 text-[11px]">
        <ActionButton
          title="React with 👍"
          onClick={() => void react('+1')}
          disabled={busy !== 'idle'}
        >
          👍
        </ActionButton>
        <ActionButton
          title="React with ❤️"
          onClick={() => void react('heart')}
          disabled={busy !== 'idle'}
        >
          ❤
        </ActionButton>
        <ActionButton
          title="React with 🚀"
          onClick={() => void react('rocket')}
          disabled={busy !== 'idle'}
        >
          🚀
        </ActionButton>
        <ActionButton
          title={replyOpen ? 'Cancel reply' : 'Draft reply'}
          onClick={() => setReplyOpen((v) => !v)}
        >
          {replyOpen ? 'Cancel' : 'Reply'}
        </ActionButton>
        {onMarkReviewed ? (
          <ActionButton
            title="Mark PR as reviewed"
            onClick={() => onMarkReviewed(item)}
          >
            Mark reviewed
          </ActionButton>
        ) : null}
        {busy === 'done' ? (
          <span className="text-gh-success-emphasis">✓</span>
        ) : null}
      </div>
      {replyOpen ? (
        <div className="mt-2 space-y-1">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Leave a comment…"
            rows={3}
            className="w-full rounded-md border border-gh-border-default bg-gh-canvas-subtle px-2 py-1 text-xs text-gh-fg-default"
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => void submitReply()}
              disabled={!draft.trim() || busy === 'reply'}
              className="rounded-md border border-gh-accent-emphasis bg-gh-accent-emphasis/10 px-2 py-1 text-[11px] text-gh-accent-emphasis disabled:opacity-60"
            >
              {busy === 'reply' ? 'Posting…' : 'Post comment'}
            </button>
          </div>
        </div>
      ) : null}
      {error ? <div className="mt-1 text-[11px] text-gh-danger-emphasis">{error}</div> : null}
    </div>
  );
}

function ActionButton({
  children,
  title,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className="rounded-md border border-gh-border-default px-2 py-0.5 text-[11px] text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-accent-emphasis disabled:opacity-60"
    >
      {children}
    </button>
  );
}
