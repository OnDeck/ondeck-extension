import { useCallback, useEffect, useState } from 'react';
import { CountRow } from '../components/CountRow';
import type { TabId } from '../tabs';
import {
  fetchDashboardCounts,
  GitHubApiError,
  type DashboardCounts,
  type Viewer,
} from '../../lib/github-api';
import { getStoredAuth } from '../../lib/auth';

interface Props {
  viewer: Viewer;
  onNavigate: (tab: TabId) => void;
}

type Status = 'loading' | 'ready' | 'error';

export function HomeTab({ viewer, onNavigate }: Props) {
  const [status, setStatus] = useState<Status>('loading');
  const [counts, setCounts] = useState<DashboardCounts | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    const { token } = await getStoredAuth();
    if (!token) {
      setStatus('error');
      setError('You are signed out.');
      return;
    }
    try {
      const data = await fetchDashboardCounts(token, viewer.login);
      setCounts(data);
      setStatus('ready');
    } catch (err) {
      const msg =
        err instanceof GitHubApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to load dashboard';
      setError(msg);
      setStatus('error');
    }
  }, [viewer.login]);

  useEffect(() => {
    void load();
  }, [load]);

  const total =
    (counts?.assigned ?? 0) +
    (counts?.reviewRequested ?? 0) +
    (counts?.mentions ?? 0) +
    (counts?.notifications ?? 0);

  return (
    <div className="flex h-full flex-col gap-3 p-3">
      <div className="flex items-center gap-3 rounded-md border border-gh-border-default bg-gh-canvas-subtle px-3 py-2">
        <img
          src={viewer.avatar_url}
          alt={viewer.login}
          className="h-10 w-10 rounded-full border border-gh-border-default"
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-gh-fg-default">
            {viewer.name ?? viewer.login}
          </div>
          <a
            href={viewer.html_url}
            target="_blank"
            rel="noreferrer"
            className="truncate text-xs text-gh-fg-muted hover:text-gh-accent-emphasis"
          >
            @{viewer.login}
          </a>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={status === 'loading'}
          className="rounded-md border border-gh-border-default px-2 py-1 text-[11px] text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-fg-default disabled:opacity-60"
        >
          {status === 'loading' ? '…' : 'Refresh'}
        </button>
      </div>

      {status === 'loading' && !counts && (
        <div className="flex flex-1 items-center justify-center text-xs text-gh-fg-muted">
          Loading dashboard…
        </div>
      )}

      {status === 'error' && (
        <div className="rounded-md border border-gh-danger-emphasis bg-gh-canvas-subtle px-3 py-2 text-xs text-gh-danger-emphasis">
          {error}
        </div>
      )}

      {counts && (
        <div className="flex flex-col gap-2">
          <CountRow
            label="Assigned PRs"
            icon="◎"
            count={counts.assigned}
            onClick={() => onNavigate('assigned')}
          />
          <CountRow
            label="Review Requests"
            icon="✓"
            count={counts.reviewRequested}
            onClick={() => onNavigate('reviews')}
          />
          <CountRow
            label="Mentions"
            icon="@"
            count={counts.mentions}
            onClick={() => onNavigate('mentions')}
          />
          <CountRow
            label="Unread Notifications"
            icon="●"
            count={counts.notifications}
            onClick={() => onNavigate('notifications')}
          />

          {status === 'ready' && total === 0 && (
            <div className="mt-1 rounded-md border border-gh-border-muted bg-gh-canvas-subtle px-3 py-2 text-center text-[11px] text-gh-fg-muted">
              Inbox zero. Nothing needs your attention right now.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
