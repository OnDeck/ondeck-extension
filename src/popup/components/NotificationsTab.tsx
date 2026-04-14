import { useCallback, useEffect, useMemo, useState } from 'react';
import { getStoredToken } from '../../lib/auth';
import {
  GitHubApiError,
  fetchNotifications,
  markNotificationRead,
  notificationHtmlUrl,
  type NotificationItem,
  type NotificationReason,
} from '../../lib/github-api';
import { EmptyState, ErrorState, LoadingState, formatRelativeAge, openInNewTab } from './common';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; items: NotificationItem[] }
  | { kind: 'error'; message: string };

const REASON_FILTERS: { value: NotificationReason | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'mention', label: 'Mentions' },
  { value: 'review_requested', label: 'Reviews' },
  { value: 'assign', label: 'Assigned' },
  { value: 'author', label: 'Authored' },
];

function typeIcon(type: string): string {
  switch (type) {
    case 'PullRequest':
      return '⇅';
    case 'Issue':
      return '◎';
    case 'Discussion':
      return '💬';
    case 'Release':
      return '⎘';
    case 'Commit':
      return '✧';
    default:
      return '•';
  }
}

function reasonLabel(reason: NotificationReason): string {
  switch (reason) {
    case 'assign':
      return 'Assigned';
    case 'author':
      return 'Authored';
    case 'comment':
      return 'Commented';
    case 'mention':
      return 'Mentioned';
    case 'review_requested':
      return 'Review';
    case 'team_mention':
      return 'Team';
    case 'ci_activity':
      return 'CI';
    case 'state_change':
      return 'State';
    case 'subscribed':
      return 'Subscribed';
    default:
      return reason;
  }
}

interface Group {
  key: string;
  repo: NotificationItem['repository'];
  items: NotificationItem[];
}

function groupByRepo(items: NotificationItem[]): Group[] {
  const map = new Map<string, Group>();
  for (const item of items) {
    const key = item.repository.full_name;
    const existing = map.get(key);
    if (existing) {
      existing.items.push(item);
    } else {
      map.set(key, { key, repo: item.repository, items: [item] });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.repo.full_name.localeCompare(b.repo.full_name));
}

export function NotificationsTab() {
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [filter, setFilter] = useState<NotificationReason | 'all'>('all');

  const load = useCallback(async () => {
    setState({ kind: 'loading' });
    const token = await getStoredToken();
    if (!token) {
      setState({ kind: 'error', message: 'Not signed in' });
      return;
    }
    try {
      const items = await fetchNotifications(token);
      setState({ kind: 'ready', items });
    } catch (err) {
      const message =
        err instanceof GitHubApiError ? err.message : 'Failed to load notifications';
      setState({ kind: 'error', message });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleMarkRead = useCallback(async (id: string) => {
    const token = await getStoredToken();
    if (!token) return;
    try {
      await markNotificationRead(id, token);
      setState((prev) => {
        if (prev.kind !== 'ready') return prev;
        return { kind: 'ready', items: prev.items.filter((item) => item.id !== id) };
      });
    } catch {
      // Silently ignore — user can re-try.
    }
  }, []);

  const visible = useMemo(() => {
    if (state.kind !== 'ready') return [];
    if (filter === 'all') return state.items;
    return state.items.filter((item) => item.reason === filter);
  }, [state, filter]);

  const groups = useMemo(() => groupByRepo(visible), [visible]);

  if (state.kind === 'loading') return <LoadingState label="Loading notifications…" />;
  if (state.kind === 'error') return <ErrorState message={state.message} onRetry={load} />;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 overflow-x-auto border-b border-gh-border-muted px-2 py-2">
        {REASON_FILTERS.map((f) => {
          const active = f.value === filter;
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={
                'flex-none rounded-md border px-2 py-0.5 text-[11px] transition-colors ' +
                (active
                  ? 'border-gh-accent-emphasis text-gh-accent-emphasis'
                  : 'border-gh-border-default text-gh-fg-muted hover:text-gh-fg-default')
              }
            >
              {f.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => void load()}
          className="ml-auto flex-none text-[11px] text-gh-accent-emphasis hover:underline"
        >
          Refresh
        </button>
      </div>
      {groups.length === 0 ? (
        <EmptyState
          title="No notifications"
          description={filter === 'all' ? 'Your inbox is clear.' : 'No notifications match this filter.'}
        />
      ) : (
        <div className="flex-1 overflow-y-auto">
          {groups.map((group) => (
            <section key={group.key}>
              <header className="sticky top-0 border-b border-gh-border-muted bg-gh-canvas-default px-4 py-1 text-[11px] font-semibold text-gh-fg-muted">
                {group.repo.full_name}
              </header>
              <ul className="divide-y divide-gh-border-muted">
                {group.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start gap-2 px-4 py-2 transition-colors hover:bg-gh-canvas-subtle"
                  >
                    <span className="mt-0.5 w-4 flex-none text-center text-xs text-gh-fg-muted">
                      {typeIcon(item.subject.type)}
                    </span>
                    <button
                      type="button"
                      onClick={() => openInNewTab(notificationHtmlUrl(item))}
                      className="flex min-w-0 flex-1 flex-col text-left"
                    >
                      <span className="truncate text-xs text-gh-fg-default">
                        {item.subject.title}
                      </span>
                      <span className="text-[10px] text-gh-fg-muted">
                        {reasonLabel(item.reason)} · {formatRelativeAge(item.updated_at)}
                      </span>
                    </button>
                    <button
                      type="button"
                      title="Mark as read"
                      onClick={() => void handleMarkRead(item.id)}
                      className="flex-none rounded-md border border-gh-border-default px-1.5 py-0.5 text-[10px] text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-accent-emphasis"
                    >
                      ✓
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
