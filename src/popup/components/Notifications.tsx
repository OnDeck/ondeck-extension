import { useCallback, useEffect, useMemo, useState } from 'react';
import { getStoredAuth } from '../../lib/auth';
import {
  fetchUnreadNotifications,
  GitHubApiError,
  markNotificationRead,
  notificationHtmlUrl,
  type NotificationReason,
  type NotificationThread,
} from '../../lib/github-api';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; items: NotificationThread[] }
  | { kind: 'error'; message: string };

const REASON_FILTERS: Array<{ value: 'all' | NotificationReason; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'assign', label: 'Assigned' },
  { value: 'mention', label: 'Mentioned' },
  { value: 'review_requested', label: 'Review' },
  { value: 'team_mention', label: 'Team' },
  { value: 'author', label: 'Author' },
  { value: 'ci_activity', label: 'CI' },
];

function typeIcon(type: string): string {
  switch (type) {
    case 'PullRequest':
      return 'PR';
    case 'Issue':
      return 'Issue';
    case 'Discussion':
      return 'Disc';
    case 'Release':
      return 'Rel';
    case 'Commit':
      return 'Commit';
    default:
      return type.slice(0, 4);
  }
}

export function Notifications() {
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [reason, setReason] = useState<'all' | NotificationReason>('all');

  const load = useCallback(async () => {
    setState({ kind: 'loading' });
    try {
      const { token } = await getStoredAuth();
      if (!token) {
        setState({ kind: 'error', message: 'Not signed in' });
        return;
      }
      const items = await fetchUnreadNotifications(token);
      setState({ kind: 'ready', items });
    } catch (err) {
      const message =
        err instanceof GitHubApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to load notifications';
      setState({ kind: 'error', message });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (state.kind !== 'ready') return [];
    if (reason === 'all') return state.items;
    return state.items.filter((n) => n.reason === reason);
  }, [state, reason]);

  const grouped = useMemo(() => {
    const map = new Map<string, NotificationThread[]>();
    for (const thread of filtered) {
      const slug = thread.repository.full_name;
      const list = map.get(slug) ?? [];
      list.push(thread);
      map.set(slug, list);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const markRead = async (thread: NotificationThread) => {
    const { token } = await getStoredAuth();
    if (!token) return;
    // Optimistic removal.
    setState((prev) => {
      if (prev.kind !== 'ready') return prev;
      return { kind: 'ready', items: prev.items.filter((t) => t.id !== thread.id) };
    });
    try {
      await markNotificationRead(thread.id, token);
    } catch {
      // Re-fetch on failure to restore accurate state.
      void load();
    }
  };

  const openInNewTab = (thread: NotificationThread) => {
    const url = notificationHtmlUrl(thread);
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <h2 className="text-sm font-semibold text-gh-fg-default">Notifications</h2>
        <button
          type="button"
          onClick={() => void load()}
          disabled={state.kind === 'loading'}
          className="rounded-md border border-gh-border-default px-2 py-0.5 text-[11px] text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-fg-default disabled:opacity-60"
        >
          Refresh
        </button>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-gh-border-muted px-4 pb-2">
        {REASON_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setReason(f.value)}
            className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] ${
              reason === f.value
                ? 'border-gh-accent-emphasis text-gh-accent-emphasis'
                : 'border-gh-border-default text-gh-fg-muted hover:border-gh-accent-emphasis'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {state.kind === 'loading' && (
        <div className="flex flex-1 items-center justify-center text-xs text-gh-fg-muted">
          Loading notifications…
        </div>
      )}

      {state.kind === 'error' && (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 text-center">
          <div className="text-xs text-gh-danger-emphasis">{state.message}</div>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-md border border-gh-border-default px-3 py-1 text-xs text-gh-fg-default hover:border-gh-accent-emphasis"
          >
            Retry
          </button>
        </div>
      )}

      {state.kind === 'ready' && grouped.length === 0 && (
        <div className="mx-4 mt-2 rounded-md border border-gh-border-default bg-gh-canvas-subtle p-3 text-center text-xs text-gh-fg-muted">
          No unread notifications.
        </div>
      )}

      {state.kind === 'ready' && grouped.length > 0 && (
        <div className="flex-1 overflow-y-auto">
          {grouped.map(([slug, threads]) => (
            <section key={slug} className="border-b border-gh-border-muted">
              <header className="sticky top-0 bg-gh-canvas-default px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-gh-fg-muted">
                {slug}
              </header>
              <ul>
                {threads.map((thread) => (
                  <li
                    key={thread.id}
                    className="flex items-start gap-3 border-t border-gh-border-muted px-4 py-2.5 hover:bg-gh-canvas-subtle"
                  >
                    <button
                      type="button"
                      onClick={() => openInNewTab(thread)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <span className="inline-flex shrink-0 items-center rounded-full border border-gh-border-default px-1.5 py-0.5 text-[10px] font-semibold text-gh-fg-muted">
                          {typeIcon(thread.subject.type)}
                        </span>
                        <span className="truncate text-[11px] text-gh-fg-muted">
                          {thread.reason.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="mt-0.5 truncate text-xs text-gh-fg-default">
                        {thread.subject.title}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => void markRead(thread)}
                      title="Mark as read"
                      className="shrink-0 rounded-md border border-gh-border-default px-2 py-0.5 text-[11px] text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-fg-default"
                    >
                      Read
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
