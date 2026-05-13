import { useMemo, useState } from 'react';
import {
  listNotifications,
  markNotificationRead,
  notificationHtmlUrl,
  type NotificationItem,
  type NotificationReason,
} from '../../lib/github-api';
import { relativeTime } from '../../lib/relativeTime';
import { applyFilter } from '../../shared/filters/engine';
import type { NotificationFilter } from '../../shared/filters/types';
import { groupNotifications, type GroupBy } from '../../shared/notifications/grouper';
import { prioritizeAll } from '../../shared/notifications/prioritizer';
import { useGitHubQuery } from '../hooks/useGitHubQuery';
import { cn } from '../lib/cn';
import { priorityBorderClass } from './PriorityBadge';
import { EmptyState, ErrorState, Spinner } from './States';
import { SubjectIcon } from './SubjectIcon';

interface Props {
  token: string;
}

type QuickFilter = 'all' | 'critical' | NotificationReason;

const QUICK_FILTERS: Array<{ id: QuickFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'critical', label: '🔴 Critical' },
  { id: 'review_requested', label: 'Reviews' },
  { id: 'mention', label: 'Mentions' },
  { id: 'assign', label: 'Assigned' },
  { id: 'team_mention', label: 'Team' },
];

function buildFilter(quick: QuickFilter, search: string, unreadOnly: boolean): NotificationFilter {
  const filter: NotificationFilter = {};
  if (search) filter.search = search;
  if (unreadOnly) filter.unreadOnly = true;
  if (quick === 'critical') {
    filter.priorities = ['critical'];
  } else if (quick !== 'all') {
    filter.reasons = [quick as NotificationReason];
  }
  return filter;
}

interface GroupSectionProps {
  label: string;
  items: ReturnType<typeof prioritizeAll>;
  collapsed: boolean;
  onToggle: () => void;
  markingIds: Set<string>;
  onMarkRead: (item: NotificationItem) => void;
}

function GroupSection({
  label,
  items,
  collapsed,
  onToggle,
  markingIds,
  onMarkRead,
}: GroupSectionProps) {
  return (
    <section className="border-b border-gh-border-muted last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between bg-gh-canvas-subtle px-4 py-1.5 text-left hover:bg-gh-canvas-inset"
      >
        <span className="text-[10px] font-semibold uppercase tracking-wide text-gh-fg-muted">
          {label}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="rounded-full bg-gh-border-default px-1.5 py-0.5 text-[10px] font-semibold text-gh-fg-muted">
            {items.length}
          </span>
          <span className="text-[10px] text-gh-fg-muted">{collapsed ? '▸' : '▾'}</span>
        </span>
      </button>

      {!collapsed &&
        items.map((item) => {
          const marking = markingIds.has(item.id);
          return (
            <div
              key={item.id}
              className={cn(
                'flex items-start gap-2 border-l-2 border-t border-gh-border-muted px-3 py-2 first:border-t-0 hover:bg-gh-canvas-subtle',
                priorityBorderClass(item.priority.level),
              )}
            >
              <SubjectIcon type={item.subject.type} />
              <a
                href={notificationHtmlUrl(item)}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 flex-1"
              >
                <div className="truncate text-xs font-semibold text-gh-fg-default hover:text-gh-accent-emphasis">
                  {item.subject.title}
                </div>
                <div className="mt-0.5 text-[10px] text-gh-fg-muted">
                  {item.priority.reason} · {relativeTime(item.updated_at)}
                </div>
              </a>
              <button
                type="button"
                onClick={() => onMarkRead(item)}
                disabled={marking}
                title="Mark as read"
                className="shrink-0 rounded-md border border-gh-border-default px-1.5 py-0.5 text-[10px] text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-accent-emphasis disabled:opacity-50"
              >
                {marking ? '…' : '✓'}
              </button>
            </div>
          );
        })}
    </section>
  );
}

export function Notifications({ token }: Props) {
  const query = useGitHubQuery(() => listNotifications(token, { all: false }), [token]);

  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [search, setSearch] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [groupBy, setGroupBy] = useState<GroupBy>('repository');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [markingIds, setMarkingIds] = useState<Set<string>>(new Set());
  const [locallyRead, setLocallyRead] = useState<Set<string>>(new Set());

  const prioritized = useMemo(
    () => prioritizeAll((query.data ?? []).filter((n) => !locallyRead.has(n.id))),
    [query.data, locallyRead],
  );

  const filtered = useMemo(
    () => applyFilter(prioritized, buildFilter(quickFilter, search, unreadOnly)),
    [prioritized, quickFilter, search, unreadOnly],
  );

  const groups = useMemo(() => groupNotifications(filtered, groupBy), [filtered, groupBy]);

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleMarkRead = async (item: NotificationItem) => {
    setMarkingIds((prev) => new Set(prev).add(item.id));
    try {
      await markNotificationRead(token, item.id);
      setLocallyRead((prev) => new Set(prev).add(item.id));
    } catch {
      // Leave the row visible; user can retry via refetch.
    } finally {
      setMarkingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Search */}
      <div className="border-b border-gh-border-muted px-2 pt-2 pb-1.5">
        <input
          type="search"
          placeholder="Search notifications…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-md border border-gh-border-default bg-gh-canvas-subtle px-2 py-1 text-xs text-gh-fg-default outline-none placeholder:text-gh-fg-muted focus:border-gh-accent-emphasis"
        />
      </div>

      {/* Quick-filter pills */}
      <div className="flex gap-1 overflow-x-auto border-b border-gh-border-muted px-2 py-1.5">
        {QUICK_FILTERS.map((f) => {
          const active = f.id === quickFilter;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setQuickFilter(f.id)}
              className={cn(
                'shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-colors',
                active
                  ? 'border-gh-accent-emphasis bg-gh-accent-emphasis/20 text-gh-accent-emphasis'
                  : 'border-gh-border-default text-gh-fg-muted hover:text-gh-fg-default',
              )}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Toolbar: group-by + unread-only toggle */}
      <div className="flex items-center justify-between border-b border-gh-border-muted px-3 py-1">
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-gh-fg-muted">Group:</span>
          {(['repository', 'priority'] as GroupBy[]).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGroupBy(g)}
              className={cn(
                'rounded px-1.5 py-0.5 text-[10px] font-semibold transition-colors',
                groupBy === g
                  ? 'bg-gh-accent-emphasis/20 text-gh-accent-emphasis'
                  : 'text-gh-fg-muted hover:text-gh-fg-default',
              )}
            >
              {g === 'repository' ? 'Repo' : 'Priority'}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setUnreadOnly((v) => !v)}
          className={cn(
            'rounded px-1.5 py-0.5 text-[10px] font-semibold transition-colors',
            unreadOnly
              ? 'bg-gh-accent-emphasis/20 text-gh-accent-emphasis'
              : 'text-gh-fg-muted hover:text-gh-fg-default',
          )}
        >
          Unread only
        </button>
      </div>

      {/* Notification list */}
      <div className="flex-1 overflow-y-auto">
        {query.status === 'loading' || query.status === 'idle' ? (
          <Spinner />
        ) : query.status === 'error' && query.error ? (
          <ErrorState error={query.error} onRetry={query.refetch} />
        ) : groups.length === 0 ? (
          <EmptyState title="Inbox zero" hint="Unread notifications will appear here." />
        ) : (
          groups.map((group) => (
            <GroupSection
              key={group.key}
              label={group.label}
              items={group.items}
              collapsed={collapsedGroups.has(group.key)}
              onToggle={() => toggleGroup(group.key)}
              markingIds={markingIds}
              onMarkRead={(item) => void handleMarkRead(item)}
            />
          ))
        )}
      </div>
    </div>
  );
}
