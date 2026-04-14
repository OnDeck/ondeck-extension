import { useCallback, useEffect, useState } from 'react';
import { fetchDashboardCounts, type DashboardCounts } from '../../lib/github-api';
import type { Viewer } from '../../lib/github-api';
import { getStoredToken } from '../../lib/auth';

export type DashboardTab = 'assigned' | 'reviews' | 'mentions' | 'notifications';

interface Props {
  viewer: Viewer;
  onNavigate: (tab: DashboardTab) => void;
}

interface RowDef {
  key: DashboardTab;
  label: string;
  description: string;
}

const ROWS: RowDef[] = [
  { key: 'assigned', label: 'Assigned PRs', description: 'Pull requests assigned to you' },
  { key: 'reviews', label: 'Review requests', description: 'PRs awaiting your review' },
  { key: 'mentions', label: 'Mentions', description: 'Issues and PRs that @ you' },
  { key: 'notifications', label: 'Notifications', description: 'Unread activity' },
];

function formatCount(value: number, max = 50): string {
  if (value >= max) return `${max}+`;
  return value.toString();
}

export function Dashboard({ viewer, onNavigate }: Props) {
  const [counts, setCounts] = useState<DashboardCounts | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getStoredToken();
      if (!token) {
        throw new Error('Not signed in');
      }
      const next = await fetchDashboardCounts(token, viewer.login);
      setCounts(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
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
          Overview
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

      <ul className="mt-2 flex flex-col gap-1 px-2 pb-3">
        {ROWS.map((row) => {
          const value = counts ? readCount(counts, row.key) : null;
          return (
            <li key={row.key}>
              <button
                type="button"
                onClick={() => onNavigate(row.key)}
                className="flex w-full items-center justify-between gap-3 rounded-md border border-transparent px-3 py-2 text-left hover:border-gh-border-default hover:bg-gh-canvas-subtle focus:border-gh-accent-emphasis focus:outline-none"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-gh-fg-default">
                    {row.label}
                  </div>
                  <div className="truncate text-[11px] text-gh-fg-muted">
                    {row.description}
                  </div>
                </div>
                <span className="shrink-0 rounded-full border border-gh-border-default bg-gh-canvas-subtle px-2 py-0.5 text-xs font-semibold text-gh-fg-default">
                  {loading && value === null ? '…' : value !== null ? formatCount(value) : '—'}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {error && (
        <div className="mx-4 mb-3 rounded-md border border-gh-danger-emphasis bg-gh-canvas-subtle px-3 py-2 text-xs text-gh-danger-emphasis">
          {error}
        </div>
      )}

      {!loading && !error && counts && allZero(counts) && (
        <div className="mx-4 mb-3 rounded-md border border-gh-border-default bg-gh-canvas-subtle px-3 py-2 text-xs text-gh-fg-muted">
          You're all caught up.
        </div>
      )}
    </div>
  );
}

function readCount(counts: DashboardCounts, key: DashboardTab): number {
  switch (key) {
    case 'assigned':
      return counts.assignedPrs;
    case 'reviews':
      return counts.reviewRequests;
    case 'mentions':
      return counts.mentions;
    case 'notifications':
      return counts.notifications;
  }
}

function allZero(counts: DashboardCounts): boolean {
  return (
    counts.assignedPrs === 0 &&
    counts.reviewRequests === 0 &&
    counts.mentions === 0 &&
    counts.notifications === 0
  );
}
