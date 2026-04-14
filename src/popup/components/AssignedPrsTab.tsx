import { useCallback, useEffect, useState } from 'react';
import { getStoredAuth } from '../../lib/auth';
import { searchIssues, type GitHubSearchItem } from '../../lib/github-api';
import { ownerRepoFromUrl, openInNewTab, relativeTime } from '../../lib/format';
import type { Viewer } from '../../lib/github-api';

interface Props {
  viewer: Viewer;
}

type Status = 'loading' | 'ready' | 'error';

type PrStatus = 'draft' | 'changes' | 'closed' | 'open';

function prStatus(item: GitHubSearchItem): PrStatus {
  if (item.state === 'closed') return 'closed';
  if (item.draft || item.pull_request?.draft) return 'draft';
  if (item.labels.some((l) => /changes.?requested/i.test(l.name))) return 'changes';
  return 'open';
}

function StatusBadge({ status }: { status: PrStatus }) {
  const map: Record<PrStatus, { label: string; cls: string }> = {
    open: { label: 'Open', cls: 'bg-gh-success-emphasis/20 text-gh-success-emphasis' },
    draft: { label: 'Draft', cls: 'bg-gh-border-muted text-gh-fg-muted' },
    changes: {
      label: 'Changes',
      cls: 'bg-gh-attention-emphasis/20 text-gh-attention-emphasis',
    },
    closed: { label: 'Closed', cls: 'bg-gh-danger-emphasis/20 text-gh-danger-emphasis' },
  };
  const { label, cls } = map[status];
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${cls}`}>{label}</span>
  );
}

export function AssignedPrsTab({ viewer }: Props) {
  const [status, setStatus] = useState<Status>('loading');
  const [items, setItems] = useState<GitHubSearchItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const { token } = await getStoredAuth();
      if (!token) throw new Error('Not signed in');
      const result = await searchIssues(
        `is:pr is:open assignee:${viewer.login}`,
        token,
      );
      setItems(result);
      setStatus('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
      setStatus('error');
    }
  }, [viewer.login]);

  useEffect(() => {
    void load();
  }, [load]);

  if (status === 'loading' && items.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-gh-fg-muted">
        Loading assigned PRs…
      </div>
    );
  }

  if (status === 'error' && items.length === 0) {
    return (
      <div className="space-y-2 text-xs">
        <div className="rounded-md border border-gh-danger-emphasis bg-gh-canvas-subtle px-3 py-2 text-gh-danger-emphasis">
          {error ?? 'Something went wrong'}
        </div>
        <button
          type="button"
          className="rounded-md border border-gh-border-default px-2 py-1 text-[11px] text-gh-fg-muted hover:border-gh-accent-emphasis"
          onClick={() => void load()}
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 text-xs">
      <div className="flex items-center justify-between">
        <div className="text-gh-fg-muted">{items.length} assigned</div>
        <button
          type="button"
          className="rounded-md border border-gh-border-default px-2 py-1 text-[11px] text-gh-fg-muted hover:border-gh-accent-emphasis disabled:opacity-60"
          onClick={() => void load()}
          disabled={status === 'loading'}
        >
          {status === 'loading' ? '…' : 'Refresh'}
        </button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-md border border-gh-border-default bg-gh-canvas-subtle px-3 py-4 text-center text-gh-fg-muted">
          Nothing assigned to you.
        </div>
      ) : (
        <ul className="divide-y divide-gh-border-muted rounded-md border border-gh-border-default bg-gh-canvas-subtle">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => openInNewTab(item.html_url)}
                className="flex w-full flex-col gap-1 px-3 py-2 text-left hover:bg-black/20"
              >
                <div className="flex items-center gap-2">
                  <StatusBadge status={prStatus(item)} />
                  <span className="truncate text-gh-fg-default">{item.title}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-gh-fg-muted">
                  <span className="truncate">
                    {ownerRepoFromUrl(item.html_url)}#{item.number}
                  </span>
                  <span>{relativeTime(item.updated_at)}</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
