import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchNotifications,
  markNotificationAsRead,
  type NotificationItem,
} from '../../lib/github-api';
import { relativeTime } from '../lib/relative-time';
import { EmptyState, ErrorState, LoadingState, ViewHeader } from './ListStates';

interface Props {
  token: string | null;
}

type ReasonFilter = 'all' | 'assign' | 'mention' | 'review_requested';

const REASON_FILTERS: { key: ReasonFilter; label: string; match: (r: string) => boolean }[] = [
  { key: 'all', label: 'All', match: () => true },
  { key: 'assign', label: 'Assigned', match: (r) => r === 'assign' },
  { key: 'mention', label: 'Mentioned', match: (r) => r === 'mention' || r === 'team_mention' },
  { key: 'review_requested', label: 'Reviews', match: (r) => r === 'review_requested' },
];

function iconFor(type: string) {
  switch (type) {
    case 'PullRequest':
      return '⇄';
    case 'Issue':
      return '◎';
    case 'Discussion':
      return '💬';
    case 'Release':
      return '⎈';
    default:
      return '•';
  }
}

function subjectHref(item: NotificationItem): string {
  if (!item.subject.url) return item.repository.html_url;
  // api.github.com/repos/owner/name/pulls/123  →  github.com/owner/name/pull/123
  return item.subject.url
    .replace('api.github.com/repos', 'github.com')
    .replace('/pulls/', '/pull/');
}

export function Notifications({ token }: Props) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ReasonFilter>('all');
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchNotifications(token)
      .then((list) => {
        if (!cancelled) setItems(list);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, tick]);

  const markRead = useCallback(
    async (id: string) => {
      if (!token) return;
      const previous = items;
      setItems((current) => current.filter((n) => n.id !== id));
      try {
        await markNotificationAsRead(token, id);
      } catch (err) {
        setItems(previous);
        setError(err instanceof Error ? err.message : 'Failed to mark as read');
      }
    },
    [token, items],
  );

  const visible = useMemo(() => {
    const match = REASON_FILTERS.find((f) => f.key === filter)?.match ?? (() => true);
    return items.filter((item) => match(item.reason));
  }, [items, filter]);

  const groups = useMemo(() => {
    const byRepo = new Map<string, NotificationItem[]>();
    for (const item of visible) {
      const key = item.repository.full_name;
      const bucket = byRepo.get(key) ?? [];
      bucket.push(item);
      byRepo.set(key, bucket);
    }
    return Array.from(byRepo.entries());
  }, [visible]);

  return (
    <div className="flex flex-col">
      <ViewHeader title="Inbox" loading={loading} onRefresh={refresh} />
      <div className="flex gap-1 px-4 pb-2">
        {REASON_FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={
              'rounded-md border px-2 py-0.5 text-[10px] ' +
              (filter === f.key
                ? 'border-gh-accent-emphasis text-gh-fg-default'
                : 'border-gh-border-default text-gh-fg-muted hover:text-gh-fg-default')
            }
          >
            {f.label}
          </button>
        ))}
      </div>
      {error && <ErrorState message={error} />}
      {loading && items.length === 0 && <LoadingState />}
      {!loading && !error && visible.length === 0 && (
        <EmptyState message="Inbox zero." />
      )}

      <div className="flex flex-col">
        {groups.map(([repo, bucket]) => (
          <section key={repo} className="flex flex-col">
            <div className="border-y border-gh-border-muted bg-gh-canvas-subtle px-4 py-1 text-[11px] font-semibold text-gh-fg-muted">
              {repo}
            </div>
            <ul>
              {bucket.map((item) => (
                <li
                  key={item.id}
                  className="border-t border-gh-border-muted first:border-t-0"
                >
                  <div className="flex items-start gap-2 px-4 py-2 hover:bg-gh-canvas-subtle">
                    <span
                      aria-hidden
                      className="mt-0.5 text-base leading-none text-gh-fg-muted"
                    >
                      {iconFor(item.subject.type)}
                    </span>
                    <a
                      href={subjectHref(item)}
                      target="_blank"
                      rel="noreferrer"
                      className="min-w-0 flex-1"
                    >
                      <div className="truncate text-sm text-gh-fg-default">
                        {item.subject.title}
                      </div>
                      <div className="text-[11px] text-gh-fg-muted">
                        {item.reason.replace('_', ' ')} · {relativeTime(item.updated_at)}
                      </div>
                    </a>
                    <button
                      type="button"
                      onClick={() => void markRead(item.id)}
                      title="Mark as read"
                      className="text-[10px] text-gh-fg-muted hover:text-gh-fg-default"
                    >
                      ✓
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
