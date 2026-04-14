import { useCallback, useEffect, useState } from 'react';
import { fetchDashboardCounts, type DashboardCounts } from '../../lib/counts';
import { getStoredAuth } from '../../lib/auth';
import type { Viewer } from '../../lib/github-api';
import type { TabId } from '../tabs';
import { WeeklyStats } from './WeeklyStats';

interface Props {
  viewer: Viewer;
  accountId: string | null;
  onNavigate: (tab: TabId) => void;
}

type Status = 'loading' | 'ready' | 'error';

interface Row {
  key: string;
  label: string;
  target: TabId;
  count: number;
}

export function HomeTab({ viewer, accountId, onNavigate }: Props) {
  const [status, setStatus] = useState<Status>('loading');
  const [counts, setCounts] = useState<DashboardCounts | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const { token } = await getStoredAuth();
      if (!token) {
        throw new Error('Not signed in');
      }
      const result = await fetchDashboardCounts(token, viewer.login);
      setCounts(result);
      setStatus('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load counts');
      setStatus('error');
    }
  }, [viewer.login]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows: Row[] = counts
    ? [
        { key: 'assigned', label: 'Assigned PRs', target: 'assigned', count: counts.assignedPrs },
        {
          key: 'reviews',
          label: 'Review Requests',
          target: 'reviews',
          count: counts.reviewRequests,
        },
        { key: 'mentions', label: 'Mentions', target: 'mentions', count: counts.mentions },
        {
          key: 'notifications',
          label: 'Unread Notifications',
          target: 'notifications',
          count: counts.notifications,
        },
      ]
    : [];

  if (status === 'loading' && !counts) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-gh-fg-muted">
        Loading…
      </div>
    );
  }

  if (status === 'error' && !counts) {
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

  const total = rows.reduce((sum, r) => sum + r.count, 0);

  return (
    <div className="flex flex-col gap-3 text-xs">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">Hi {viewer.name ?? viewer.login} 👋</div>
          <div className="text-gh-fg-muted">
            {total === 0 ? 'Inbox zero — nothing is waiting on you.' : `${total} item${total === 1 ? '' : 's'} need your attention.`}
          </div>
        </div>
        <button
          type="button"
          className="rounded-md border border-gh-border-default px-2 py-1 text-[11px] text-gh-fg-muted hover:border-gh-accent-emphasis disabled:opacity-60"
          onClick={() => void load()}
          disabled={status === 'loading'}
        >
          {status === 'loading' ? '…' : 'Refresh'}
        </button>
      </div>

      {accountId && <WeeklyStats accountId={accountId} />}

      <ul className="divide-y divide-gh-border-muted rounded-md border border-gh-border-default bg-gh-canvas-subtle">
        {rows.map((row) => (
          <li key={row.key}>
            <button
              type="button"
              onClick={() => onNavigate(row.target)}
              className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-black/20"
            >
              <span className="text-gh-fg-default">{row.label}</span>
              <span className="flex items-center gap-2">
                <span
                  className={
                    'rounded-full px-2 py-0.5 text-[11px] font-semibold ' +
                    (row.count > 0
                      ? 'bg-gh-accent-emphasis/20 text-gh-accent-emphasis'
                      : 'bg-gh-border-muted text-gh-fg-muted')
                  }
                >
                  {row.count}
                </span>
                <span aria-hidden className="text-gh-fg-muted">›</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
