import { useMemo, useState } from 'react';
import { relativeTime, type NotificationThread } from '../../lib/github-api';
import { useNotifications } from '../hooks/useNotifications';
import { StatusMessage } from './StatusMessage';

interface Props {
  active: boolean;
}

const REASON_LABELS: Record<string, string> = {
  assign: 'Assigned',
  author: 'Author',
  comment: 'Comment',
  ci_activity: 'CI',
  invitation: 'Invitation',
  manual: 'Subscribed',
  mention: 'Mentioned',
  review_requested: 'Review requested',
  security_alert: 'Security',
  state_change: 'State change',
  subscribed: 'Subscribed',
  team_mention: 'Team mention',
};

const TYPE_ICONS: Record<string, string> = {
  PullRequest: '⇄',
  Issue: '●',
  Discussion: '✶',
  Release: '⬆',
  Commit: '✔',
};

function webUrlFor(thread: NotificationThread): string {
  // The notifications API returns an api.github.com URL; approximate a
  // web URL by stripping "api." and "/repos".
  const api = thread.subject.url ?? thread.url;
  if (!api) return thread.repository.html_url;
  return api
    .replace('https://api.github.com/repos/', 'https://github.com/')
    .replace('/pulls/', '/pull/');
}

function groupByRepo(list: NotificationThread[]): Map<string, NotificationThread[]> {
  const out = new Map<string, NotificationThread[]>();
  for (const item of list) {
    const key = item.repository.full_name;
    const bucket = out.get(key);
    if (bucket) bucket.push(item);
    else out.set(key, [item]);
  }
  return out;
}

export function NotificationsView({ active }: Props) {
  const { status, items, error, refresh, markRead } = useNotifications(active);
  const [reasonFilter, setReasonFilter] = useState<string>('all');

  const reasons = useMemo(() => {
    if (!items) return [] as string[];
    return Array.from(new Set(items.map((i) => i.reason))).sort();
  }, [items]);

  const filtered = useMemo(() => {
    if (!items) return null;
    if (reasonFilter === 'all') return items;
    return items.filter((i) => i.reason === reasonFilter);
  }, [items, reasonFilter]);

  const grouped = filtered ? groupByRepo(filtered) : null;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gh-fg-muted">
            Unread notifications
          </h2>
          {items && (
            <div className="text-[11px] text-gh-fg-muted">
              {items.length} unread
              {reasonFilter !== 'all' && filtered ? ` · ${filtered.length} shown` : ''}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={status === 'loading'}
          className="rounded-md border border-gh-border-default px-2 py-1 text-[11px] text-gh-fg-muted hover:text-gh-fg-default disabled:opacity-60"
        >
          {status === 'loading' ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {items && reasons.length > 1 && (
        <div className="flex flex-wrap gap-1">
          <FilterChip
            label="All"
            active={reasonFilter === 'all'}
            onClick={() => setReasonFilter('all')}
          />
          {reasons.map((reason) => (
            <FilterChip
              key={reason}
              label={REASON_LABELS[reason] ?? reason}
              active={reasonFilter === reason}
              onClick={() => setReasonFilter(reason)}
            />
          ))}
        </div>
      )}

      {status === 'loading' && !items && <StatusMessage>Loading…</StatusMessage>}
      {status === 'error' && (
        <StatusMessage tone="danger">{error ?? 'Failed to load'}</StatusMessage>
      )}
      {grouped && grouped.size === 0 && status === 'ready' && (
        <StatusMessage>Inbox zero. Nothing unread.</StatusMessage>
      )}

      {grouped &&
        Array.from(grouped.entries()).map(([repo, threads]) => (
          <div key={repo} className="flex flex-col">
            <div className="flex items-center gap-2 px-1 pb-1">
              <img
                src={threads[0].repository.owner.avatar_url}
                alt={threads[0].repository.owner.login}
                className="h-4 w-4 rounded-full border border-gh-border-default"
              />
              <span className="truncate text-[11px] font-semibold text-gh-fg-muted">
                {repo}
              </span>
              <span className="ml-auto text-[10px] text-gh-fg-muted">{threads.length}</span>
            </div>
            <ul className="flex flex-col divide-y divide-gh-border-muted rounded-md border border-gh-border-default bg-gh-canvas-subtle">
              {threads.map((thread) => (
                <li key={thread.id}>
                  <NotificationRow
                    thread={thread}
                    onMarkRead={() => void markRead(thread.id)}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
    </section>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition-colors ${
        active
          ? 'border-gh-accent-emphasis bg-gh-accent-emphasis/15 text-gh-fg-default'
          : 'border-gh-border-default text-gh-fg-muted hover:text-gh-fg-default'
      }`}
    >
      {label}
    </button>
  );
}

function NotificationRow({
  thread,
  onMarkRead,
}: {
  thread: NotificationThread;
  onMarkRead: () => void;
}) {
  const icon = TYPE_ICONS[thread.subject.type] ?? '•';
  const reason = REASON_LABELS[thread.reason] ?? thread.reason;
  const href = webUrlFor(thread);

  return (
    <div className="flex items-start gap-2 px-3 py-2">
      <span
        aria-hidden
        className="mt-[2px] inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-gh-border-default text-[11px] text-gh-fg-muted"
      >
        {icon}
      </span>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="min-w-0 flex-1 focus:outline-none"
      >
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-gh-fg-muted">
          <span>{reason}</span>
          <span className="ml-auto">{relativeTime(thread.updated_at)}</span>
        </div>
        <div className="line-clamp-2 text-[13px] font-medium text-gh-fg-default">
          {thread.subject.title}
        </div>
      </a>
      <button
        type="button"
        onClick={onMarkRead}
        title="Mark as read"
        aria-label={`Mark "${thread.subject.title}" as read`}
        className="shrink-0 rounded-md border border-gh-border-default px-1.5 py-0.5 text-[10px] text-gh-fg-muted hover:text-gh-fg-default"
      >
        ✓
      </button>
    </div>
  );
}
