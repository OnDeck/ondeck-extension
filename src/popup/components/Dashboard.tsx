import { useEffect, useState, useCallback } from 'react';
import type { Viewer } from '../../lib/github-api';
import { fetchDashboardCounts, type DashboardCounts } from '../../lib/github-api';
import { getStoredAuth } from '../../lib/auth';

interface Props {
  viewer: Viewer;
  onNavigate: (tab: 'assigned' | 'reviews' | 'mentions' | 'notifications') => void;
}

type Status = 'loading' | 'ready' | 'error';

interface RowProps {
  label: string;
  count: number;
  onClick: () => void;
}

function Row({ label, count, onClick }: RowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-md border border-gh-border-default bg-gh-canvas-subtle px-3 py-2 text-left text-sm hover:border-gh-accent-emphasis"
    >
      <span className="text-gh-fg-default">{label}</span>
      <span className="rounded-full bg-gh-canvas-default px-2 py-0.5 text-xs font-semibold text-gh-fg-default">
        {count}
      </span>
    </button>
  );
}

export function Dashboard({ viewer, onNavigate }: Props) {
  const [status, setStatus] = useState<Status>('loading');
  const [counts, setCounts] = useState<DashboardCounts | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const { token } = await getStoredAuth();
      if (!token) throw new Error('Not signed in');
      const next = await fetchDashboardCounts(viewer.login, token);
      setCounts(next);
      setStatus('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
      setStatus('error');
    }
  }, [viewer.login]);

  useEffect(() => {
    void load();
  }, [load]);

  if (status === 'loading') {
    return (
      <div className="flex h-full items-center justify-center text-xs text-gh-fg-muted">
        Loading counts…
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-6 text-xs text-gh-danger-emphasis">
        <span>{error}</span>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-md border border-gh-border-default px-2 py-1 text-gh-fg-muted hover:border-gh-accent-emphasis"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!counts) {
    return (
      <div className="py-6 text-center text-xs text-gh-fg-muted">Nothing to show yet.</div>
    );
  }

  const total =
    counts.assignedPrs + counts.reviewRequests + counts.mentions + counts.unreadNotifications;

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-6 text-xs text-gh-fg-muted">
        <span>You’re all caught up.</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Row label="Assigned PRs" count={counts.assignedPrs} onClick={() => onNavigate('assigned')} />
      <Row
        label="Review Requests"
        count={counts.reviewRequests}
        onClick={() => onNavigate('reviews')}
      />
      <Row label="Mentions" count={counts.mentions} onClick={() => onNavigate('mentions')} />
      <Row
        label="Unread Notifications"
        count={counts.unreadNotifications}
        onClick={() => onNavigate('notifications')}
      />
    </div>
  );
}
