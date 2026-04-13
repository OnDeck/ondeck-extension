import { useCallback, useEffect, useState } from 'react';
import {
  fetchDashboardCounts,
  GitHubApiError,
  type DashboardCounts,
  type Viewer,
} from '../../lib/github-api';
import { getStoredAuth } from '../../lib/auth';

export type DashboardTab =
  | 'home'
  | 'assigned'
  | 'reviews'
  | 'mentions'
  | 'notifications';

interface Props {
  viewer: Viewer;
  onNavigate: (tab: DashboardTab) => void;
}

interface Row {
  key: DashboardTab;
  label: string;
  count: number;
}

export function Dashboard({ viewer, onNavigate }: Props) {
  const [counts, setCounts] = useState<DashboardCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { token } = await getStoredAuth();
      if (!token) {
        throw new GitHubApiError('Not signed in', 0, 'unauthorized');
      }
      const next = await fetchDashboardCounts(token, viewer.login);
      setCounts(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load counts');
    } finally {
      setLoading(false);
    }
  }, [viewer.login]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !counts) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-gh-fg-muted">
        Loading dashboard…
      </div>
    );
  }

  if (error && !counts) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
        <p className="text-xs text-gh-danger-emphasis">{error}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-md border border-gh-border-default px-3 py-1 text-xs text-gh-fg-default hover:border-gh-accent-emphasis"
        >
          Retry
        </button>
      </div>
    );
  }

  const rows: Row[] = [
    { key: 'assigned', label: 'Assigned PRs', count: counts?.assignedPrs ?? 0 },
    { key: 'reviews', label: 'Review requests', count: counts?.reviewRequests ?? 0 },
    { key: 'mentions', label: 'Mentions', count: counts?.mentions ?? 0 },
    { key: 'notifications', label: 'Unread notifications', count: counts?.notifications ?? 0 },
  ];

  const totalCount = rows.reduce((sum, r) => sum + r.count, 0);

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-3 px-4 py-3">
        <img
          src={viewer.avatar_url}
          alt={viewer.login}
          className="h-10 w-10 rounded-full border border-gh-border-default"
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">
            {viewer.name ?? viewer.login}
          </div>
          <div className="truncate text-xs text-gh-fg-muted">@{viewer.login}</div>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded-md border border-gh-border-default px-2 py-1 text-[11px] text-gh-fg-muted hover:border-gh-accent-emphasis disabled:opacity-60"
        >
          {loading ? '…' : 'Refresh'}
        </button>
      </div>

      <ul className="divide-y divide-gh-border-muted border-t border-gh-border-default">
        {rows.map((row) => (
          <li key={row.key}>
            <button
              type="button"
              onClick={() => onNavigate(row.key)}
              className="flex w-full items-center justify-between px-4 py-3 text-left text-xs text-gh-fg-default hover:bg-gh-canvas-subtle"
            >
              <span>{row.label}</span>
              <span
                className={`rounded-md border border-gh-border-default px-2 py-0.5 font-mono text-[11px] ${
                  row.count > 0 ? 'text-gh-fg-default' : 'text-gh-fg-muted'
                }`}
              >
                {row.count}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {totalCount === 0 && !loading && (
        <p className="px-4 py-3 text-[11px] text-gh-fg-muted">
          You're all caught up. Check back later for new activity.
        </p>
      )}
    </div>
  );
}
