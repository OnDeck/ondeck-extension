import { useCallback, useEffect, useMemo, useState } from 'react';
import { getStoredAuth } from '../../lib/auth';
import {
  fetchNotifications,
  groupByRepo,
  htmlUrlForSubject,
  markNotificationRead,
  type NotificationReason,
  type NotificationSubjectType,
  type RawNotification,
} from '../../lib/github-notifications';

type Status = 'loading' | 'ready' | 'error';

const REASON_LABELS: Record<NotificationReason, string> = {
  assign: 'Assigned',
  author: 'Author',
  comment: 'Comment',
  ci_activity: 'CI',
  invitation: 'Invitation',
  manual: 'Manual',
  mention: 'Mentioned',
  review_requested: 'Review',
  security_alert: 'Security',
  state_change: 'State',
  subscribed: 'Subscribed',
  team_mention: 'Team',
};

const REASON_FILTERS: Array<{ id: 'all' | NotificationReason; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'assign', label: 'Assigned' },
  { id: 'mention', label: 'Mentioned' },
  { id: 'review_requested', label: 'Reviews' },
];

function typeIcon(type: NotificationSubjectType): string {
  switch (type) {
    case 'PullRequest':
      return '⇄';
    case 'Issue':
      return '◉';
    case 'Discussion':
      return '💬';
    case 'Release':
      return '⛬';
    case 'Commit':
      return '◆';
    default:
      return '•';
  }
}

export function Notifications() {
  const [status, setStatus] = useState<Status>('loading');
  const [items, setItems] = useState<RawNotification[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [filter, setFilter] = useState<'all' | NotificationReason>('all');

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setError(null);
    (async () => {
      try {
        const { token } = await getStoredAuth();
        if (!token) throw new Error('Not signed in');
        const next = await fetchNotifications(token);
        if (cancelled) return;
        setItems(next);
        setStatus('ready');
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load');
        setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tick]);

  const filtered = useMemo(
    () => (filter === 'all' ? items : items.filter((i) => i.reason === filter)),
    [items, filter],
  );
  const groups = useMemo(() => groupByRepo(filtered), [filtered]);

  const onMarkRead = useCallback(
    async (id: string) => {
      try {
        const { token } = await getStoredAuth();
        if (!token) return;
        await markNotificationRead(id, token);
        setItems((prev) => prev.filter((i) => i.id !== id));
      } catch {
        // Swallow; refresh will reconcile.
      }
    },
    [],
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 pt-3">
        <h2 className="text-sm font-semibold text-gh-fg-default">Notifications</h2>
        <button
          type="button"
          onClick={refresh}
          disabled={status === 'loading'}
          className="rounded-md border border-gh-border-default px-2 py-1 text-[11px] text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-fg-default disabled:opacity-60"
        >
          {status === 'loading' ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <div className="mt-2 flex gap-1 px-3">
        {REASON_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`rounded-md border px-2 py-[2px] text-[10px] ${
              filter === f.id
                ? 'border-gh-accent-emphasis text-gh-fg-default'
                : 'border-gh-border-default text-gh-fg-muted hover:text-gh-fg-default'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {status === 'error' && (
        <div className="mx-4 mt-3 rounded-md border border-gh-danger-emphasis bg-gh-canvas-subtle px-3 py-2 text-xs text-gh-danger-emphasis">
          {error}
        </div>
      )}

      {status === 'ready' && groups.length === 0 && (
        <div className="mx-4 mt-3 rounded-md border border-gh-border-default bg-gh-canvas-subtle px-3 py-2 text-[11px] text-gh-fg-muted">
          Inbox zero.
        </div>
      )}

      <div className="mt-2 flex-1 overflow-y-auto px-2 pb-3">
        {groups.map((group) => (
          <section key={group.repo} className="mb-3">
            <h3 className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wide text-gh-fg-muted">
              {group.repo}
            </h3>
            <ul className="space-y-1">
              {group.items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start gap-2 rounded-md border border-transparent px-2 py-1.5 hover:border-gh-border-default hover:bg-gh-canvas-subtle"
                >
                  <span className="mt-0.5 w-4 text-center font-mono text-[11px] text-gh-fg-muted">
                    {typeIcon(item.subject.type)}
                  </span>
                  <a
                    href={htmlUrlForSubject(item)}
                    target="_blank"
                    rel="noreferrer"
                    className="min-w-0 flex-1"
                  >
                    <div className="truncate text-xs text-gh-fg-default">
                      {item.subject.title}
                    </div>
                    <div className="text-[10px] text-gh-fg-muted">
                      {REASON_LABELS[item.reason] ?? item.reason}
                    </div>
                  </a>
                  <button
                    type="button"
                    onClick={() => void onMarkRead(item.id)}
                    title="Mark as read"
                    className="rounded-md border border-gh-border-default px-1.5 py-[1px] text-[10px] text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-fg-default"
                  >
                    ✓
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
