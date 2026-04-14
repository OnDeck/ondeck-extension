import { useCallback, useEffect, useMemo, useState } from 'react';
import { getStoredAuth } from '../../lib/auth';
import {
  fetchUnreadNotifications,
  markNotificationRead,
  notificationHtmlUrl,
  type NotificationItem,
} from '../../lib/github-api';

type Status = 'loading' | 'ready' | 'error';

const REASON_LABELS: Record<string, string> = {
  assign: 'Assigned',
  author: 'Author',
  comment: 'Comment',
  ci_activity: 'CI',
  invitation: 'Invitation',
  manual: 'Subscribed',
  mention: 'Mention',
  review_requested: 'Review requested',
  security_alert: 'Security',
  state_change: 'State change',
  subscribed: 'Subscribed',
  team_mention: 'Team mention',
};

const REASON_FILTERS: { id: 'all' | string; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'assign', label: 'Assigned' },
  { id: 'mention', label: 'Mentions' },
  { id: 'review_requested', label: 'Reviews' },
];

function iconFor(type: string): string {
  switch (type) {
    case 'PullRequest':
      return '↪';
    case 'Issue':
      return '◎';
    case 'Discussion':
      return '💬';
    case 'Release':
      return '🏷';
    case 'Commit':
      return '●';
    default:
      return '○';
  }
}

function groupByRepo(items: NotificationItem[]): Record<string, NotificationItem[]> {
  return items.reduce<Record<string, NotificationItem[]>>((acc, item) => {
    const key = item.repository.full_name;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
}

export function NotificationsTab() {
  const [status, setStatus] = useState<Status>('loading');
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState<'all' | string>('all');

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const { token } = await getStoredAuth();
      if (!token) throw new Error('Not signed in');
      const data = await fetchUnreadNotifications(token);
      setItems(data);
      setStatus('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (reason === 'all') return items;
    return items.filter((i) => i.reason === reason);
  }, [items, reason]);

  const grouped = useMemo(() => groupByRepo(filtered), [filtered]);

  const markRead = async (item: NotificationItem) => {
    const { token } = await getStoredAuth();
    if (!token) return;
    try {
      await markNotificationRead(item.id, token);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mark-as-read failed');
    }
  };

  const openAndMark = (item: NotificationItem) => {
    const url = notificationHtmlUrl(item);
    chrome.tabs?.create({ url });
    void markRead(item);
  };

  if (status === 'loading' && items.length === 0) {
    return <div className="p-3 text-center text-xs text-gh-fg-muted">Loading notifications…</div>;
  }
  if (status === 'error') {
    return (
      <div className="flex flex-col items-center gap-2 p-3 text-xs text-gh-danger-emphasis">
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

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1 overflow-x-auto">
        {REASON_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setReason(f.id)}
            className={
              'whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] ' +
              (reason === f.id
                ? 'border-gh-accent-emphasis text-gh-fg-default'
                : 'border-gh-border-default text-gh-fg-muted')
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-md border border-gh-border-default bg-gh-canvas-subtle p-3 text-center text-xs text-gh-fg-muted">
          Inbox zero.
        </div>
      )}

      {Object.entries(grouped).map(([repo, group]) => (
        <section key={repo} className="flex flex-col gap-1">
          <h3 className="text-[10px] font-semibold uppercase tracking-wide text-gh-fg-muted">
            {repo}
          </h3>
          <ul className="flex flex-col gap-1">
            {group.map((item) => (
              <li
                key={item.id}
                className="flex items-start gap-2 rounded-md border border-gh-border-default bg-gh-canvas-subtle p-2"
              >
                <span className="mt-0.5 text-sm leading-none text-gh-fg-muted">
                  {iconFor(item.subject.type)}
                </span>
                <button
                  type="button"
                  onClick={() => openAndMark(item)}
                  className="flex min-w-0 flex-1 flex-col text-left"
                >
                  <span className="truncate text-xs font-medium text-gh-fg-default">
                    {item.subject.title}
                  </span>
                  <span className="text-[11px] text-gh-fg-muted">
                    {REASON_LABELS[item.reason] ?? item.reason}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => void markRead(item)}
                  className="rounded-md border border-gh-border-default px-1.5 py-0.5 text-[10px] text-gh-fg-muted hover:border-gh-accent-emphasis"
                  title="Mark as read"
                >
                  ✓
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
