import { useEffect, useMemo, useRef, useState } from 'react';
import {
  markAllNotificationsRead,
  markNotificationRead,
  markRepoNotificationsRead,
  type NotificationItem,
} from '../../lib/github-api';
import { applyFilter, extractRepositories } from '../../shared/filters/engine';
import type { NotificationFilter } from '../../shared/filters/types';
import { planMarkRead, type MarkReadPlan } from '../../shared/notifications/markRead';
import { prioritizeAll } from '../../shared/notifications/prioritizer';
import { useNotificationsFeed } from '../hooks/useNotificationsFeed';
import type { ChipId } from './ChipRail';
import { ChipRail } from './ChipRail';
import { FilterPanel } from './FilterPanel';
import { NotifRow } from './NotifRow';
import { PopupFooter } from './PopupFooter';
import { ROW_ATTRIBUTE, listRows, shouldIgnoreShortcut, stepIndex } from '../lib/keyboard';
import { EmptyState, ErrorState, Spinner } from './States';

interface Props {
  token: string;
  onUnreadCountChange: (n: number) => void;
  /** Bumped by the header's refresh button. */
  refreshSignal: number;
  onReconnect: () => void;
  searchOpen?: boolean;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onSearchClose?: () => void;
}

type MarkAllState = 'idle' | 'confirm' | 'working' | 'error';

const MARK_THREADS_CONCURRENCY = 4;

/** PATCHes threads a few at a time; resolves to the ids that failed. */
async function markThreadsRead(token: string, ids: string[]): Promise<string[]> {
  const failed: string[] = [];
  for (let i = 0; i < ids.length; i += MARK_THREADS_CONCURRENCY) {
    const batch = ids.slice(i, i + MARK_THREADS_CONCURRENCY);
    const results = await Promise.allSettled(batch.map((id) => markNotificationRead(token, id)));
    results.forEach((r, j) => {
      if (r.status === 'rejected') failed.push(batch[j]);
    });
  }
  return failed;
}

async function executeMarkRead(token: string, plan: MarkReadPlan): Promise<string[]> {
  switch (plan.kind) {
    case 'all':
      await markAllNotificationsRead(token, plan.lastReadAt);
      return [];
    case 'repos':
      await Promise.all(plan.repos.map((repo) => markRepoNotificationsRead(token, repo, plan.lastReadAt)));
      return [];
    case 'threads':
      return markThreadsRead(token, plan.ids);
    case 'none':
      return [];
  }
}

function confirmCopy(plan: MarkReadPlan): string {
  if (plan.kind === 'all') return 'Mark everything in your inbox as read?';
  if (plan.kind === 'repos') {
    return plan.repos.length === 1
      ? `Mark everything in ${plan.repos[0]} as read?`
      : `Mark everything in ${plan.repos.length} repos as read?`;
  }
  if (plan.kind === 'none') return '';
  return plan.count === 1 ? 'Mark 1 notification as read?' : `Mark ${plan.count} notifications as read?`;
}

function buildFilter(
  chip: ChipId,
  repos: string[],
  dateFrom: string,
  dateTo: string,
): NotificationFilter {
  const base: NotificationFilter = {};

  // Chip filter - GitHub defaults only
  switch (chip) {
    case 'all':
      // Inbox - all notifications
      break;
    case 'unread':
      base.unreadOnly = true;
      break;
    case 'participating':
      // Notifications where you're directly involved
      base.reasons = ['author', 'assign', 'mention', 'team_mention', 'review_requested', 'comment', 'state_change'];
      break;
    case 'mentions':
      base.reasons = ['mention', 'team_mention'];
      break;
    case 'reviews':
      base.reasons = ['review_requested'];
      break;
    case 'assigned':
      base.reasons = ['assign'];
      break;
  }

  // Advanced filters
  if (repos.length > 0) {
    base.repositories = repos;
  }
  if (dateFrom || dateTo) {
    base.dateRange = {
      from: dateFrom ? new Date(dateFrom) : undefined,
      to: dateTo ? new Date(dateTo) : undefined,
    };
  }

  return base;
}

function countsByChip(
  items: ReturnType<typeof prioritizeAll>,
): Partial<Record<ChipId, number>> {
  const participatingReasons = ['author', 'assign', 'mention', 'team_mention', 'review_requested', 'comment', 'state_change'];

  return {
    all:           items.length,
    unread:        items.filter((n) => n.unread).length,
    participating: items.filter((n) => participatingReasons.includes(n.reason)).length,
    mentions:      items.filter((n) => n.reason === 'mention' || n.reason === 'team_mention').length,
    reviews:       items.filter((n) => n.reason === 'review_requested').length,
    assigned:      items.filter((n) => n.reason === 'assign').length,
  };
}

export function Notifications({
  token,
  onUnreadCountChange,
  refreshSignal,
  onReconnect,
  searchOpen = false,
  searchQuery = '',
  onSearchChange,
  onSearchClose,
}: Props) {
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) {
      searchInputRef.current?.focus();
    }
  }, [searchOpen]);

  // Fetch only the most-recent page on open. Notifications come back
  // newest-first, and each extra page is a sequential round-trip — pulling all
  // ~10 pages was the dominant cause of slow popup open. Older pages load on
  // demand via the "Load more" button below.
  const feed = useNotificationsFeed(token, true);

  // Live-refresh the list when the background worker reports new
  // notifications, so an open popup stays current without a manual refresh.
  const { refresh, setUnread } = feed;
  useEffect(() => {
    const handleMessage = (message: unknown) => {
      if (
        typeof message === 'object' &&
        message !== null &&
        (message as Record<string, unknown>)['type'] === 'NEW_NOTIFICATIONS'
      ) {
        void refresh({ delta: true });
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, [refresh]);

  useEffect(() => {
    if (refreshSignal > 0) void refresh();
  }, [refreshSignal, refresh]);

  const [chip, setChip] = useState<ChipId>('all');
  const [markingIds, setMarkingIds] = useState<Set<string>>(new Set());
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [selectedRepos, setSelectedRepos] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const prioritized = useMemo(() => prioritizeAll(feed.items), [feed.items]);

  useEffect(() => {
    onUnreadCountChange(prioritized.filter((n) => n.unread).length);
  }, [prioritized, onUnreadCountChange]);

  const counts = useMemo(() => countsByChip(prioritized), [prioritized]);

  const allRepositories = useMemo(() => extractRepositories(prioritized), [prioritized]);

  const filtered = useMemo(() => {
    const filterResult = applyFilter(prioritized, buildFilter(chip, selectedRepos, dateFrom, dateTo));

    if (!searchQuery.trim()) {
      return filterResult;
    }

    const lowerQuery = searchQuery.toLowerCase();
    return filterResult.filter((n) =>
      n.subject.title.toLowerCase().includes(lowerQuery) ||
      n.repository.full_name.toLowerCase().includes(lowerQuery)
    );
  }, [prioritized, chip, selectedRepos, dateFrom, dateTo, searchQuery]);

  const handleResetFilters = () => {
    setSelectedRepos([]);
    setDateFrom('');
    setDateTo('');
  };

  const activeFilterCount = selectedRepos.length + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0);

  const [markAllState, setMarkAllState] = useState<MarkAllState>('idle');
  const markReadPlan = useMemo(
    () =>
      planMarkRead({
        visible: filtered,
        unscoped: (chip === 'all' || chip === 'unread') && !searchQuery.trim() && !dateFrom && !dateTo,
        selectedRepos,
      }),
    [filtered, chip, searchQuery, dateFrom, dateTo, selectedRepos],
  );

  const handleMarkAll = async () => {
    if (markReadPlan.kind === 'none') return;
    const affected = filtered.filter((n) => n.unread).map((n) => n.id);
    setMarkAllState('working');
    setUnread(affected, false);
    try {
      const failed = await executeMarkRead(token, markReadPlan);
      if (failed.length > 0) {
        setUnread(failed, true);
        setMarkAllState('error');
      } else {
        setMarkAllState('idle');
      }
    } catch {
      setUnread(affected, true);
      setMarkAllState('error');
    }
    chrome.runtime.sendMessage({ type: 'REQUEST_SYNC' }).catch(() => {
      // Background worker not awake yet; the next alarm will fix the badge.
    });
  };

  // Optimistic: flip the row to read immediately and roll back on failure,
  // rather than refetching (which flashed the skeleton and dropped loaded pages).
  const handleMark = async (item: NotificationItem) => {
    setMarkingIds((prev) => new Set(prev).add(item.id));
    setUnread(item.id, false);
    try {
      await markNotificationRead(token, item.id);
      chrome.runtime.sendMessage({ type: 'REQUEST_SYNC' }).catch(() => {
        // Background worker not awake yet; the next alarm will fix the badge.
      });
    } catch {
      setUnread(item.id, true);
    } finally {
      setMarkingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  const barButton =
    'flex shrink-0 cursor-pointer items-center rounded border border-tg-line font-sans';
  const confirmButton = 'cursor-pointer rounded px-2.5 py-1 font-sans text-[11.5px]';

  // j/k (or ↓/↑) move focus between rows, so Enter opens the focused row
  // natively; o opens it too, e marks it read.
  const filteredRef = useRef(filtered);
  filteredRef.current = filtered;
  const handleMarkRef = useRef(handleMark);
  handleMarkRef.current = handleMark;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (shouldIgnoreShortcut(e)) return;
      const rows = listRows();
      const current = rows.findIndex((row) => row === document.activeElement);

      if (e.key === 'j' || e.key === 'ArrowDown' || e.key === 'k' || e.key === 'ArrowUp') {
        const next = stepIndex(current, rows.length, e.key === 'j' || e.key === 'ArrowDown' ? 1 : -1);
        if (next < 0) return;
        e.preventDefault();
        rows[next].focus();
        rows[next].scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'o' && current >= 0) {
        e.preventDefault();
        rows[current].click();
      } else if (e.key === 'e' && current >= 0) {
        const id = rows[current].getAttribute(ROW_ATTRIBUTE);
        const item = filteredRef.current.find((n) => n.id === id);
        if (!item?.unread) return;
        e.preventDefault();
        void handleMarkRef.current(item);
        // On the Unread chip the row disappears; keep focus at the same position.
        requestAnimationFrame(() => {
          if (listRows().includes(document.activeElement as HTMLElement)) return;
          const remaining = listRows();
          remaining[Math.min(current, remaining.length - 1)]?.focus();
        });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center border-b border-tg-line bg-tg-bg1">
        <div className="min-w-0 flex-1">
          <ChipRail active={chip} counts={counts} onChange={setChip} />
        </div>
        <button
          type="button"
          onClick={() => setMarkAllState('confirm')}
          disabled={markReadPlan.kind === 'none' || markAllState === 'working'}
          title={markReadPlan.kind === 'all' ? 'Mark all as read' : 'Mark these as read'}
          aria-label={markReadPlan.kind === 'all' ? 'Mark all as read' : 'Mark these as read'}
          className={`${barButton} my-1.5 ml-2 bg-transparent px-2 py-1.5 text-tg-fg2 enabled:hover:border-tg-accent-border enabled:hover:text-tg-accent disabled:cursor-default disabled:opacity-40`}
        >
          <svg
            width="14"
            height="12"
            viewBox="0 0 16 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M1 6.5l3 3 6-7M7 9.5l1 1 6-7" />
          </svg>
        </button>
        <button
          type="button"
          data-testid="filter-button"
          onClick={() => setFilterPanelOpen(true)}
          title="Advanced filters"
          aria-label="Advanced filters"
          className={`${barButton} mx-2 my-1.5 gap-1 px-3 py-1.5 text-[11px] font-medium ${
            activeFilterCount > 0 ? 'bg-tg-accent-soft text-tg-accent' : 'bg-transparent text-tg-fg2'
          }`}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          >
            <path d="M1 2h12M3 7h8M5 12h4" />
          </svg>
          {activeFilterCount > 0 && <span>({activeFilterCount})</span>}
        </button>
      </div>

      {markAllState !== 'idle' && (
        <div
          role={markAllState === 'error' ? 'alert' : undefined}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setMarkAllState('idle');
          }}
          className={`flex items-center gap-2 border-b border-tg-line px-2.5 py-[7px] font-sans text-[12px] text-tg-fg0 ${
            markAllState === 'error' ? 'bg-tg-critical-soft' : 'bg-tg-accent-soft'
          }`}
        >
          <span className="min-w-0 flex-1">
            {markAllState === 'working'
              ? 'Marking as read…'
              : markAllState === 'error'
                ? 'Couldn’t mark everything as read.'
                : confirmCopy(markReadPlan)}
          </span>
          {markAllState !== 'working' && (
            <>
              <button
                type="button"
                autoFocus
                onClick={() => void handleMarkAll()}
                className={`${confirmButton} border-none bg-tg-accent font-semibold text-white`}
              >
                {markAllState === 'error' ? 'Retry' : 'Mark read'}
              </button>
              <button
                type="button"
                onClick={() => setMarkAllState('idle')}
                className={`${confirmButton} border border-tg-line-strong bg-transparent text-tg-fg1`}
              >
                {markAllState === 'error' ? 'Dismiss' : 'Cancel'}
              </button>
            </>
          )}
        </div>
      )}

      {searchOpen && (
        <div className="flex items-center gap-2 border-b border-tg-line bg-tg-bg1 px-2.5 py-2">
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onSearchClose?.();
            }}
            placeholder="Search notifications…"
            className="flex-1 rounded border border-tg-line bg-tg-bg0 px-2.5 py-1.5 font-sans text-[13px] text-tg-fg0 outline-none"
          />
          <button
            type="button"
            onClick={() => onSearchClose?.()}
            title="Close search · Esc"
            className="cursor-pointer rounded border border-tg-line bg-transparent px-2.5 py-1.5 font-sans text-[11px] text-tg-fg2"
          >
            Esc
          </button>
        </div>
      )}

      <div className="tg-scroll flex-1 overflow-y-auto bg-tg-bg1">
        {feed.status === 'loading' || feed.status === 'idle' ? (
          <Spinner />
        ) : feed.status === 'error' && feed.error ? (
          <ErrorState error={feed.error} onRetry={feed.refetch} onReconnect={onReconnect} />
        ) : filtered.length === 0 ? (
          chip === 'all' && activeFilterCount === 0 && !searchQuery.trim() ? (
            <EmptyState />
          ) : (
            <EmptyState title="Nothing matches." hint="Try another filter or clear your search." />
          )
        ) : (
          <>
            {filtered.map((item, i) => (
              <div
                key={item.id}
                className={i === filtered.length - 1 ? undefined : 'border-b border-tg-line'}
              >
                <NotifRow
                  item={item}
                  marking={markingIds.has(item.id)}
                  onMark={(n) => void handleMark(n)}
                />
              </div>
            ))}
            {feed.hasMore && (
              <button
                type="button"
                onClick={() => void feed.loadMore()}
                disabled={feed.loadingMore}
                className="w-full cursor-pointer border-x-0 border-b-0 border-t border-tg-line bg-transparent p-2.5 font-sans text-[12px] text-tg-fg2 disabled:cursor-default"
              >
                {feed.loadingMore ? 'Loading…' : 'Load more'}
              </button>
            )}
          </>
        )}
      </div>

      <PopupFooter
        updatedAt={feed.updatedAt}
        refreshing={feed.refreshing}
        refreshFailed={feed.refreshError !== null}
        onRetry={() => void refresh()}
      />

      <FilterPanel
        open={filterPanelOpen}
        onClose={() => setFilterPanelOpen(false)}
        repositories={allRepositories}
        selectedRepos={selectedRepos}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onRepoChange={setSelectedRepos}
        onDateChange={(from, to) => {
          setDateFrom(from);
          setDateTo(to);
        }}
        onReset={handleResetFilters}
      />
    </div>
  );
}
