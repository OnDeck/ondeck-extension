import { useState } from 'react';
import {
  addIssueReaction,
  markPullRequestReviewed,
  postIssueComment,
  repoFromIssue,
  type SearchIssueItem,
} from '../../lib/github-api';
import { getStoredAuth } from '../../lib/auth';

interface Props {
  item: SearchIssueItem;
  onMarkedReviewed?: () => void;
}

type Status = 'idle' | 'busy' | 'done' | 'error';

export function QuickActions({ item, onMarkedReviewed }: Props) {
  const [status, setStatus] = useState<Status>('idle');
  const [draft, setDraft] = useState('');
  const [showDraft, setShowDraft] = useState(false);

  const repo = repoFromIssue(item);

  const run = async (fn: () => Promise<void>) => {
    setStatus('busy');
    try {
      const { token } = await getStoredAuth();
      if (!token) throw new Error('Not authenticated');
      await fn();
      setStatus('done');
      setTimeout(() => setStatus('idle'), 1500);
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 2500);
    }
  };

  const handleMarkReviewed = (e: React.MouseEvent) => {
    e.stopPropagation();
    void run(async () => {
      const { token } = await getStoredAuth();
      if (!token) throw new Error('Not authenticated');
      await markPullRequestReviewed(repo, item.number, token);
      onMarkedReviewed?.();
    });
  };

  const handleReact = (e: React.MouseEvent) => {
    e.stopPropagation();
    void run(async () => {
      const { token } = await getStoredAuth();
      if (!token) throw new Error('Not authenticated');
      await addIssueReaction(repo, item.number, '+1', token);
    });
  };

  const handleSubmitDraft = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!draft.trim()) return;
    void run(async () => {
      const { token } = await getStoredAuth();
      if (!token) throw new Error('Not authenticated');
      await postIssueComment(repo, item.number, draft.trim(), token);
      setDraft('');
      setShowDraft(false);
    });
  };

  return (
    <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
      <div className="flex flex-wrap gap-1">
        {item.pull_request && (
          <button
            type="button"
            onClick={handleMarkReviewed}
            disabled={status === 'busy'}
            className="rounded-md border border-gh-border-default px-1.5 py-0.5 text-[10px] text-gh-fg-muted hover:border-gh-success-emphasis hover:text-gh-success-emphasis disabled:opacity-60"
          >
            Mark reviewed
          </button>
        )}
        <button
          type="button"
          onClick={handleReact}
          disabled={status === 'busy'}
          className="rounded-md border border-gh-border-default px-1.5 py-0.5 text-[10px] text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-fg-default disabled:opacity-60"
        >
          👍
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowDraft((s) => !s);
          }}
          className="rounded-md border border-gh-border-default px-1.5 py-0.5 text-[10px] text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-fg-default"
        >
          Reply
        </button>
        {status === 'done' && (
          <span className="text-[10px] text-gh-success-emphasis">✓</span>
        )}
        {status === 'error' && (
          <span className="text-[10px] text-gh-danger-emphasis">failed</span>
        )}
      </div>
      {showDraft && (
        <div className="flex flex-col gap-1">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            placeholder="Draft a reply…"
            className="resize-none rounded-md border border-gh-border-default bg-gh-canvas-default px-1.5 py-1 text-[11px] text-gh-fg-default"
          />
          <button
            type="button"
            onClick={handleSubmitDraft}
            disabled={status === 'busy' || !draft.trim()}
            className="self-end rounded-md border border-gh-accent-emphasis px-2 py-0.5 text-[10px] text-gh-accent-emphasis disabled:opacity-60"
          >
            Send
          </button>
        </div>
      )}
    </div>
  );
}
