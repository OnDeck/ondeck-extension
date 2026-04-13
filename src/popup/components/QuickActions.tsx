import { useEffect, useState } from 'react';
import { getStoredAuth } from '../../lib/auth';
import { GitHubApiError } from '../../lib/github-api';
import {
  addReactionToComment,
  deleteDraftReply,
  listDraftReplies,
  markPrReviewed,
  parseCommentUrl,
  parsePullRequestUrl,
  publishDraftReply,
  saveDraftReply,
  type DraftReply,
  type ReactionContent,
} from '../../lib/quick-actions';

const REACTIONS: { value: ReactionContent; emoji: string }[] = [
  { value: '+1', emoji: '👍' },
  { value: '-1', emoji: '👎' },
  { value: 'laugh', emoji: '😄' },
  { value: 'hooray', emoji: '🎉' },
  { value: 'heart', emoji: '❤️' },
  { value: 'rocket', emoji: '🚀' },
  { value: 'eyes', emoji: '👀' },
];

interface FlashState {
  kind: 'success' | 'error';
  message: string;
}

export function QuickActions() {
  const [target, setTarget] = useState('');
  const [body, setBody] = useState('');
  const [drafts, setDrafts] = useState<DraftReply[]>([]);
  const [flash, setFlash] = useState<FlashState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void listDraftReplies().then(setDrafts);
  }, []);

  const refreshDrafts = async () => setDrafts(await listDraftReplies());

  const withToken = async <T,>(fn: (token: string) => Promise<T>): Promise<T | null> => {
    setBusy(true);
    setFlash(null);
    try {
      const { token } = await getStoredAuth();
      if (!token) {
        throw new GitHubApiError('Not signed in', 0, 'unauthorized');
      }
      return await fn(token);
    } catch (err) {
      setFlash({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Action failed',
      });
      return null;
    } finally {
      setBusy(false);
    }
  };

  const handleApprove = async () => {
    const ref = parsePullRequestUrl(target);
    if (!ref) {
      setFlash({ kind: 'error', message: 'Enter a github.com PR URL.' });
      return;
    }
    const ok = await withToken((token) => markPrReviewed(token, ref));
    if (ok !== null) {
      setFlash({ kind: 'success', message: `Marked #${ref.number} as reviewed.` });
    }
  };

  const handleReact = async (content: ReactionContent) => {
    const ref = parseCommentUrl(target);
    if (!ref) {
      setFlash({ kind: 'error', message: 'Enter a comment URL (e.g. ?#issuecomment-123).' });
      return;
    }
    const ok = await withToken((token) => addReactionToComment(token, ref, content));
    if (ok !== null) {
      setFlash({ kind: 'success', message: `Reacted with ${content}.` });
    }
  };

  const handleSaveDraft = async () => {
    if (!target.trim() || !body.trim()) {
      setFlash({ kind: 'error', message: 'Enter both a target URL and a body.' });
      return;
    }
    await saveDraftReply({ target: target.trim(), body: body.trim() });
    await refreshDrafts();
    setBody('');
    setFlash({ kind: 'success', message: 'Draft saved locally.' });
  };

  const handlePublishDraft = async (draft: DraftReply) => {
    const ok = await withToken((token) => publishDraftReply(token, draft));
    if (ok !== null) {
      await deleteDraftReply(draft.id);
      await refreshDrafts();
      setFlash({ kind: 'success', message: 'Draft published.' });
    }
  };

  const handleDeleteDraft = async (id: string) => {
    await deleteDraftReply(id);
    await refreshDrafts();
  };

  return (
    <section className="flex flex-col gap-3 px-4 py-3 text-xs">
      <div>
        <label className="block text-[11px] font-semibold text-gh-fg-muted">
          Target URL
        </label>
        <input
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder="https://github.com/org/repo/pull/123"
          spellCheck={false}
          className="mt-1 w-full rounded-md border border-gh-border-default bg-gh-canvas-subtle px-2 py-1.5 font-mono text-[11px] text-gh-fg-default outline-none focus:border-gh-accent-emphasis"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void handleApprove()}
          disabled={busy}
          className="rounded-md border border-gh-border-default bg-gh-success-emphasis px-2 py-1 font-semibold text-gh-fg-on-emphasis hover:brightness-110 disabled:opacity-60"
        >
          Mark PR reviewed
        </button>
      </div>

      <div>
        <div className="text-[11px] font-semibold text-gh-fg-muted">
          React to comment
        </div>
        <div className="mt-1 flex flex-wrap gap-1">
          {REACTIONS.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => void handleReact(r.value)}
              disabled={busy}
              className="rounded-md border border-gh-border-default bg-gh-canvas-subtle px-2 py-0.5 text-sm hover:border-gh-accent-emphasis disabled:opacity-60"
              title={r.value}
            >
              {r.emoji}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-semibold text-gh-fg-muted">
          Draft reply
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder="Type a reply…"
          className="mt-1 w-full resize-none rounded-md border border-gh-border-default bg-gh-canvas-subtle px-2 py-1.5 text-[11px] text-gh-fg-default outline-none focus:border-gh-accent-emphasis"
        />
        <button
          type="button"
          onClick={() => void handleSaveDraft()}
          disabled={busy}
          className="mt-1 rounded-md border border-gh-border-default px-2 py-1 text-[11px] text-gh-fg-default hover:border-gh-accent-emphasis disabled:opacity-60"
        >
          Save draft
        </button>
      </div>

      {drafts.length > 0 && (
        <ul className="flex flex-col gap-2">
          {drafts.map((d) => (
            <li
              key={d.id}
              className="rounded-md border border-gh-border-default bg-gh-canvas-subtle p-2"
            >
              <div className="truncate text-[10px] text-gh-fg-muted">{d.target}</div>
              <div className="line-clamp-2 text-[11px] text-gh-fg-default">
                {d.body}
              </div>
              <div className="mt-1 flex gap-2">
                <button
                  type="button"
                  onClick={() => void handlePublishDraft(d)}
                  disabled={busy}
                  className="rounded-md border border-gh-border-default px-2 py-0.5 text-[11px] text-gh-fg-default hover:border-gh-accent-emphasis disabled:opacity-60"
                >
                  Publish
                </button>
                <button
                  type="button"
                  onClick={() => void handleDeleteDraft(d.id)}
                  className="rounded-md border border-gh-border-default px-2 py-0.5 text-[11px] text-gh-fg-muted hover:border-gh-danger-emphasis"
                >
                  Discard
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {flash && (
        <div
          className={`rounded-md border px-2 py-1 text-[11px] ${
            flash.kind === 'success'
              ? 'border-gh-success-emphasis text-gh-success-emphasis'
              : 'border-gh-danger-emphasis text-gh-danger-emphasis'
          }`}
        >
          {flash.message}
        </div>
      )}

      <p className="text-[10px] text-gh-fg-muted">
        Tip: open the popup with{' '}
        <kbd className="rounded border border-gh-border-default px-1 font-mono">
          Cmd+Shift+G
        </kbd>{' '}
        (or <kbd className="rounded border border-gh-border-default px-1 font-mono">Ctrl+Shift+G</kbd> on Linux/Windows).
      </p>
    </section>
  );
}
