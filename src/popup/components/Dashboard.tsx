import { useCallback, useEffect, useState } from 'react';
import {
  fetchDashboardCounts,
  GitHubApiError,
  type DashboardCounts,
  type Viewer,
} from '../../lib/github-api';
import type { TabKey } from '../tabs';

interface Props {
  token: string;
  viewer: Viewer;
  onNavigate: (tab: TabKey) => void;
}

interface CountRow {
  key: TabKey;
  label: string;
  value: number;
  emphasis?: boolean;
}

export function Dashboard({ token, viewer, onNavigate }: Props) {
  const [counts, setCounts] = useState<DashboardCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await fetchDashboardCounts(token, viewer.login);
      setCounts(next);
    } catch (err) {
      setError(
        err instanceof GitHubApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to load counts',
      );
    } finally {
      setLoading(false);
    }
  }, [token, viewer.login]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows: CountRow[] = counts
    ? [
        { key: 'assigned', label: 'Assigned PRs', value: counts.assignedPrs },
        { key: 'reviews', label: 'Review requests', value: counts.reviewRequests, emphasis: true },
        { key: 'mentions', label: 'Mentions', value: counts.mentions },
        { key: 'notifications', label: 'Unread notifications', value: counts.unreadNotifications },
      ]
    : [];

  return (
    <section className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 pt-3">
        <h2 className="text-sm font-semibold">Workflow</h2>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded-md border border-gh-border-default px-2 py-1 text-[11px] text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-fg-default disabled:opacity-60"
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {loading && !counts && (
          <div className="rounded-md border border-gh-border-default bg-gh-canvas-subtle p-4 text-xs text-gh-fg-muted">
            Loading workflow…
          </div>
        )}

        {error && (
          <div className="rounded-md border border-gh-danger-emphasis bg-gh-canvas-subtle p-3 text-xs text-gh-danger-emphasis">
            {error}
          </div>
        )}

        {counts && (
          <ul className="divide-y divide-gh-border-muted overflow-hidden rounded-md border border-gh-border-default bg-gh-canvas-subtle">
            {rows.map((row) => (
              <li key={row.key}>
                <button
                  type="button"
                  onClick={() => onNavigate(row.key)}
                  className="flex w-full items-center justify-between px-3 py-2.5 text-left transition-colors hover:bg-gh-canvas-default"
                >
                  <span className="text-xs text-gh-fg-default">{row.label}</span>
                  <span
                    className={`min-w-[28px] rounded-full px-2 py-0.5 text-center text-[11px] font-semibold ${
                      row.emphasis && row.value > 0
                        ? 'bg-gh-accent-emphasis text-white'
                        : 'bg-gh-canvas-default text-gh-fg-muted'
                    }`}
                  >
                    {row.value}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {counts && rows.every((row) => row.value === 0) && !loading && !error && (
          <p className="mt-3 text-center text-[11px] text-gh-fg-muted">
            All caught up. Nothing needs your attention right now.
          </p>
        )}
      </div>
    </section>
  );
}
