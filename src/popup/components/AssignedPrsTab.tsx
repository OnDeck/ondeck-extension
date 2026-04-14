import { useCallback, useEffect, useState } from 'react';
import {
  fetchAssignedPullRequests,
  type PullRequestSummary,
} from '../../lib/github-api';
import type { Viewer } from '../../lib/github-api';
import { getStoredToken } from '../../lib/auth';

interface Props {
  viewer: Viewer;
}

export function AssignedPrsTab({ viewer }: Props) {
  const [items, setItems] = useState<PullRequestSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getStoredToken();
      if (!token) throw new Error('Not signed in');
      const next = await fetchAssignedPullRequests(token, viewer.login);
      setItems(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assigned PRs');
    } finally {
      setLoading(false);
    }
  }, [viewer.login]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex items-center justify-between px-4 pt-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gh-fg-muted">
          Assigned PRs
        </h2>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded-md border border-gh-border-default px-2 py-0.5 text-[11px] text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-fg-default disabled:opacity-60"
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="mx-4 mt-3 rounded-md border border-gh-danger-emphasis bg-gh-canvas-subtle px-3 py-2 text-xs text-gh-danger-emphasis">
          {error}
        </div>
      )}

      {loading && !items && (
        <div className="mx-4 mt-3 text-xs text-gh-fg-muted">Loading…</div>
      )}

      {items && items.length === 0 && !loading && !error && (
        <div className="mx-4 mt-3 rounded-md border border-gh-border-default bg-gh-canvas-subtle px-3 py-2 text-xs text-gh-fg-muted">
          No PRs are currently assigned to you.
        </div>
      )}

      {items && items.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1 px-2 pb-3">
          {items.map((pr) => (
            <li key={pr.id}>
              <a
                href={pr.html_url}
                target="_blank"
                rel="noreferrer"
                className="flex flex-col gap-1 rounded-md border border-transparent px-3 py-2 hover:border-gh-border-default hover:bg-gh-canvas-subtle"
              >
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold text-gh-fg-default">
                    {pr.title}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-gh-fg-muted">
                  <span className="truncate">
                    {pr.org}/{pr.repo} #{pr.number}
                  </span>
                  <StatusBadge state={pr.state} />
                  <span>· {timeAgo(pr.updated_at)}</span>
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatusBadge({ state }: { state: PullRequestSummary['state'] }) {
  const cfg =
    state === 'draft'
      ? { label: 'Draft', cls: 'border-gh-border-default text-gh-fg-muted' }
      : state === 'changes_requested'
        ? {
            label: 'Changes requested',
            cls: 'border-gh-danger-emphasis text-gh-danger-emphasis',
          }
        : {
            label: 'Open',
            cls: 'border-gh-success-emphasis text-gh-success-emphasis',
          };
  return (
    <span className={`rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Date.now() - then;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}
