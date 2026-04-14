import { useState } from 'react';
import { getStoredAuth } from '../../lib/auth';
import {
  addThumbsUpReaction,
  createIssueComment,
  markPrReviewed,
  repoSlugFromUrl,
  type SearchIssueItem,
} from '../../lib/github-api';
import { incrementReviewCount } from '../../lib/stats';

type Result = { kind: 'ok' | 'error'; message: string } | null;

interface Props {
  item: SearchIssueItem;
}

export function QuickActions({ item }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<Result>(null);
  const repoSlug = repoSlugFromUrl(item.repository_url);
  const isPr = Boolean(item.pull_request);

  async function withBusy(kind: string, fn: () => Promise<void>, okMessage: string) {
    setBusy(kind);
    setResult(null);
    try {
      await fn();
      setResult({ kind: 'ok', message: okMessage });
    } catch (err) {
      setResult({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Action failed',
      });
    } finally {
      setBusy(null);
    }
  }

  async function requireAuth(): Promise<{ token: string; accountId: string | null }> {
    const { token, accountId } = await getStoredAuth();
    if (!token) throw new Error('Not signed in');
    return { token, accountId };
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
          setResult(null);
        }}
        className="rounded-md border border-gh-border-default px-1.5 py-0.5 text-[11px] text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-accent-emphasis"
        title="Quick actions"
      >
        ⋯
      </button>
      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-6 z-10 flex min-w-[180px] flex-col gap-1 rounded-md border border-gh-border-default bg-gh-canvas-subtle p-1 shadow-lg"
        >
          {isPr && (
            <QuickActionButton
              label="Mark reviewed"
              busy={busy === 'review'}
              onClick={() =>
                withBusy(
                  'review',
                  async () => {
                    const auth = await requireAuth();
                    await markPrReviewed(auth.token, repoSlug, item.number);
                    if (auth.accountId) await incrementReviewCount(auth.accountId);
                  },
                  'Marked as reviewed',
                )
              }
            />
          )}
          <QuickActionButton
            label="React 👍"
            busy={busy === 'react'}
            onClick={() =>
              withBusy(
                'react',
                async () => {
                  const auth = await requireAuth();
                  await addThumbsUpReaction(auth.token, repoSlug, item.number);
                },
                'Reaction added',
              )
            }
          />
          <QuickActionButton
            label="Draft reply"
            busy={busy === 'reply'}
            onClick={() =>
              withBusy(
                'reply',
                async () => {
                  const body = window.prompt('Draft reply — posts as a comment:');
                  if (!body || !body.trim()) throw new Error('Reply cancelled');
                  const auth = await requireAuth();
                  await createIssueComment(auth.token, repoSlug, item.number, body.trim());
                },
                'Reply posted',
              )
            }
          />
          {result && (
            <div
              className={`rounded-md px-2 py-1 text-[10px] ${
                result.kind === 'ok'
                  ? 'text-gh-success-emphasis'
                  : 'text-gh-danger-emphasis'
              }`}
            >
              {result.message}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function QuickActionButton({
  label,
  onClick,
  busy,
}: {
  label: string;
  onClick: () => void;
  busy: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="rounded-md px-2 py-1 text-left text-[11px] text-gh-fg-default hover:bg-gh-border-muted/40 disabled:opacity-60"
    >
      {busy ? 'Working…' : label}
    </button>
  );
}
