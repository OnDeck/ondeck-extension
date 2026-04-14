import { useCallback, useEffect, useState } from 'react';
import { getStoredAuth } from '../../lib/auth';
import {
  fetchAssignedPrs,
  repoSlugFromRepositoryUrl,
  type SearchIssueItem,
  type Viewer,
} from '../../lib/github-api';

interface Props {
  viewer: Viewer;
}

type Status = 'loading' | 'ready' | 'error';

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d`;
  const months = Math.round(days / 30);
  return `${months}mo`;
}

function statusFor(pr: SearchIssueItem): { label: string; className: string } {
  if (pr.draft) {
    return { label: 'Draft', className: 'bg-gh-canvas-default text-gh-fg-muted' };
  }
  const changesRequested = pr.labels.some(
    (l) => l.name.toLowerCase() === 'changes requested' || l.name.toLowerCase() === 'changes-requested',
  );
  if (changesRequested) {
    return { label: 'Changes', className: 'bg-gh-danger-emphasis/20 text-gh-danger-emphasis' };
  }
  return { label: 'Open', className: 'bg-gh-success-emphasis/20 text-gh-success-emphasis' };
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

export function AssignedPrsTab({ viewer }: Props) {
  const [status, setStatus] = useState<Status>('loading');
  const [items, setItems] = useState<SearchIssueItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const { token } = await getStoredAuth();
      if (!token) throw new Error('Not signed in');
      const results = await fetchAssignedPrs(viewer.login, token);
      setItems(results);
      setStatus('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
      setStatus('error');
    }
  }, [viewer.login]);

  useEffect(() => {
    void load();
  }, [load]);

  const openPr = (pr: SearchIssueItem) => {
    const url = pr.pull_request?.html_url ?? pr.html_url;
    chrome.tabs?.create({ url });
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gh-fg-default">Assigned PRs</span>
        <button
          type="button"
          onClick={() => void load()}
          disabled={status === 'loading'}
          className="rounded-md border border-gh-border-default px-2 py-0.5 text-[11px] text-gh-fg-muted hover:border-gh-accent-emphasis disabled:opacity-60"
        >
          {status === 'loading' ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {status === 'error' && (
        <div className="rounded-md border border-gh-danger-emphasis/40 bg-gh-canvas-subtle p-2 text-xs text-gh-danger-emphasis">
          {error}
        </div>
      )}

      {status === 'ready' && items.length === 0 && (
        <div className="rounded-md border border-gh-border-default bg-gh-canvas-subtle p-3 text-center text-xs text-gh-fg-muted">
          No PRs assigned to you. 🎉
        </div>
      )}

      {status === 'loading' && items.length === 0 && (
        <div className="p-3 text-center text-xs text-gh-fg-muted">Loading…</div>
      )}

      <ul className="flex flex-col gap-1">
        {items.map((pr) => {
          const badge = statusFor(pr);
          return (
            <li key={pr.id}>
              <button
                type="button"
                onClick={() => openPr(pr)}
                className="flex w-full flex-col gap-1 rounded-md border border-gh-border-default bg-gh-canvas-subtle p-2 text-left hover:border-gh-accent-emphasis"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                  <span className="truncate text-xs font-medium text-gh-fg-default">
                    {truncate(pr.title, 56)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-gh-fg-muted">
                  <span className="truncate">{repoSlugFromRepositoryUrl(pr.repository_url)}</span>
                  <span>{timeAgo(pr.updated_at)}</span>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
