import { useEffect, useState } from 'react';
import {
  addIssueReaction,
  createIssueComment,
  type GitHubNotification,
} from '../../lib/github-api';
import { clearDraft, loadDraft, saveDraft } from '../drafts';

interface Props {
  token: string | null;
  notification: GitHubNotification;
}

/**
 * Parses an owner, repo, and issue/PR number from a notification subject URL.
 * Subject URLs look like https://api.github.com/repos/{owner}/{repo}/issues/{n}
 */
function parseIssueRef(
  n: GitHubNotification,
): { owner: string; repo: string; number: number } | null {
  if (!n.subject.url) return null;
  const m = n.subject.url.match(/\/repos\/([^/]+)\/([^/]+)\/(?:issues|pulls)\/(\d+)/);
  if (!m) return null;
  return { owner: m[1], repo: m[2], number: Number(m[3]) };
}

export function QuickActions({ token, notification }: Props) {
  const [draft, setDraft] = useState('');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<'reaction' | 'reply' | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadDraft(notification.id).then((value) => {
      if (!cancelled) setDraft(value);
    });
    return () => {
      cancelled = true;
    };
  }, [notification.id]);

  async function onDraftChange(value: string): Promise<void> {
    setDraft(value);
    await saveDraft(notification.id, value);
  }

  async function onReact(): Promise<void> {
    if (!token) return;
    const ref = parseIssueRef(notification);
    if (!ref) {
      setStatus('Cannot react: unsupported subject');
      return;
    }
    setBusy('reaction');
    try {
      await addIssueReaction(token, ref.owner, ref.repo, ref.number, '+1');
      setStatus('Reacted 👍');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Reaction failed');
    } finally {
      setBusy(null);
    }
  }

  async function onSend(): Promise<void> {
    if (!token) return;
    const ref = parseIssueRef(notification);
    if (!ref) {
      setStatus('Cannot reply: unsupported subject');
      return;
    }
    const body = draft.trim();
    if (body.length === 0) return;
    setBusy('reply');
    try {
      await createIssueComment(token, ref.owner, ref.repo, ref.number, body);
      await clearDraft(notification.id);
      setDraft('');
      setOpen(false);
      setStatus('Reply posted');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Reply failed');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => void onReact()}
          disabled={busy !== null}
          className="rounded-md border border-gh-border-default px-2 py-[2px] text-[10px] text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-fg-default disabled:opacity-60"
          title="Add 👍 reaction"
        >
          👍
        </button>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          disabled={busy !== null}
          className="rounded-md border border-gh-border-default px-2 py-[2px] text-[10px] text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-fg-default disabled:opacity-60"
          title="Draft reply"
        >
          ✏️
        </button>
      </div>
      {open && (
        <div className="flex flex-col gap-1">
          <textarea
            value={draft}
            onChange={(e) => void onDraftChange(e.target.value)}
            placeholder="Type a reply…"
            rows={2}
            className="w-full resize-none rounded-md border border-gh-border-default bg-gh-canvas-default px-2 py-1 text-[11px] text-gh-fg-default outline-none focus:border-gh-accent-emphasis"
          />
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => void onSend()}
              disabled={busy !== null || draft.trim().length === 0}
              className="rounded-md border border-gh-border-default bg-gh-accent-emphasis/20 px-2 py-[2px] text-[10px] font-semibold text-gh-accent-emphasis hover:brightness-110 disabled:opacity-60"
            >
              {busy === 'reply' ? 'Sending…' : 'Send'}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md px-2 py-[2px] text-[10px] text-gh-fg-muted hover:text-gh-fg-default"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {status && <div className="text-[10px] text-gh-fg-muted">{status}</div>}
    </div>
  );
}
