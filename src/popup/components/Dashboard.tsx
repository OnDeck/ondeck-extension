import { useCallback, useEffect, useState } from 'react';
import {
  fetchDashboardCounts,
  GitHubApiError,
  type DashboardCounts,
  type Viewer,
} from '../../lib/github-api';
import { getStoredAuth } from '../../lib/auth';
import type { TabId } from '../navigation';

interface Props {
  viewer: Viewer;
  onNavigate: (tab: TabId) => void;
}

interface Row {
  id: TabId;
  label: string;
  description: string;
}

const ROWS: Row[] = [
  { id: 'assigned', label: 'Assigned PRs', description: 'PRs where you are the assignee' },
  { id: 'reviews', label: 'Review Requests', description: 'PRs awaiting your review' },
  { id: 'mentions', label: 'Mentions', description: 'Issues & PRs that @mention you' },
  {
    id: 'notifications',
    label: 'Unread Notifications',
    description: 'Notifications inbox',
  },
];

function countFor(id: TabId, counts: DashboardCounts | null): number | null {
  if (!counts) return null;
  switch (id) {
    case 'assigned':
      return counts.assignedPrs;
    case 'reviews':
      return counts.reviewRequests;
    case 'mentions':
      return counts.mentions;
    case 'notifications':
      return counts.unreadNotifications;
    default:
      return null;
  }
}

export function Dashboard({ viewer, onNavigate }: Props) {
  const [counts, setCounts] = useState<DashboardCounts | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { token } = await getStoredAuth();
      if (!token) {
        throw new GitHubApiError('Not authenticated', 0, 'unauthorized');
      }
      const next = await fetchDashboardCounts(viewer.login, token);
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

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wide text-gh-fg-muted">Overview</div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded-md border border-gh-border-default px-2 py-1 text-[11px] text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-fg-default disabled:opacity-60"
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-gh-danger-emphasis/60 bg-gh-danger-emphasis/10 px-3 py-2 text-xs text-gh-danger-emphasis">
          {error}
        </div>
      )}

      <ul className="flex flex-col gap-2">
        {ROWS.map((row) => {
          const value = countFor(row.id, counts);
          return (
            <li key={row.id}>
              <button
                type="button"
                onClick={() => onNavigate(row.id)}
                className="flex w-full items-center justify-between rounded-md border border-gh-border-default bg-gh-canvas-subtle px-3 py-2 text-left hover:border-gh-accent-emphasis"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gh-fg-default">
                    {row.label}
                  </div>
                  <div className="truncate text-[11px] text-gh-fg-muted">
                    {row.description}
                  </div>
                </div>
                <span className="ml-3 inline-flex min-w-[28px] items-center justify-center rounded-full border border-gh-border-default bg-gh-canvas-default px-2 py-0.5 text-xs font-semibold text-gh-fg-default">
                  {loading && value === null ? '…' : (value ?? '–')}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {!error && !loading && counts === null && (
        <div className="rounded-md border border-gh-border-default bg-gh-canvas-subtle px-3 py-2 text-xs text-gh-fg-muted">
          No data yet.
        </div>
      )}
    </div>
  );
}
