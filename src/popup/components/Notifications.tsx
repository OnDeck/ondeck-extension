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

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid var(--tg-line)',
          background: 'var(--tg-bg1)',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <ChipRail active={chip} counts={counts} onChange={setChip} />
        </div>
        <button
          type="button"
          onClick={() => setMarkAllState('confirm')}
          disabled={markReadPlan.kind === 'none' || markAllState === 'working'}
          title={markReadPlan.kind === 'all' ? 'Mark all as read' : 'Mark these as read'}
          aria-label={markReadPlan.kind === 'all' ? 'Mark all as read' : 'Mark these as read'}
          className="enabled:hover:border-[var(--tg-accent-border)] enabled:hover:text-[var(--tg-accent)] disabled:opacity-40"
          style={{
            padding: '6px 8px',
            margin: '6px 0 6px 8px',
            border: '1px solid var(--tg-line)',
            borderRadius: 4,
            background: 'transparent',
            color: 'var(--tg-fg2)',
            cursor: markReadPlan.kind === 'none' ? 'default' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
          }}
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
          style={{
            padding: '6px 12px',
            margin: '6px 8px',
            border: '1px solid var(--tg-line)',
            borderRadius: 4,
            background: activeFilterCount > 0 ? 'var(--tg-accent-soft)' : 'transparent',
            color: activeFilterCount > 0 ? 'var(--tg-accent)' : 'var(--tg-fg2)',
            fontSize: 11,
            fontFamily: 'var(--tg-sans)',
            cursor: 'pointer',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            flexShrink: 0,
          }}
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
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '7px 10px',
            borderBottom: '1px solid var(--tg-line)',
            background: markAllState === 'error' ? 'var(--tg-critical-soft)' : 'var(--tg-accent-soft)',
            fontSize: 12,
            fontFamily: 'var(--tg-sans)',
            color: 'var(--tg-fg0)',
          }}
        >
          <span style={{ flex: 1, minWidth: 0 }}>
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
                style={{
                  padding: '4px 10px',
                  border: 'none',
                  borderRadius: 4,
                  background: 'var(--tg-accent)',
                  color: '#fff',
                  fontSize: 11.5,
                  fontWeight: 600,
                  fontFamily: 'var(--tg-sans)',
                  cursor: 'pointer',
                }}
              >
                {markAllState === 'error' ? 'Retry' : 'Mark read'}
              </button>
              <button
                type="button"
                onClick={() => setMarkAllState('idle')}
                style={{
                  padding: '4px 10px',
                  border: '1px solid var(--tg-line-strong)',
                  borderRadius: 4,
                  background: 'transparent',
                  color: 'var(--tg-fg1)',
                  fontSize: 11.5,
                  fontFamily: 'var(--tg-sans)',
                  cursor: 'pointer',
                }}
              >
                {markAllState === 'error' ? 'Dismiss' : 'Cancel'}
              </button>
            </>
          )}
        </div>
      )}

      {searchOpen && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 10px',
            borderBottom: '1px solid var(--tg-line)',
            background: 'var(--tg-bg1)',
          }}
        >
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onSearchClose?.();
            }}
            placeholder="Search notifications…"
            style={{
              flex: 1,
              padding: '6px 10px',
              fontSize: 13,
              fontFamily: 'var(--tg-sans)',
              color: 'var(--tg-fg0)',
              background: 'var(--tg-bg0)',
              border: '1px solid var(--tg-line)',
              borderRadius: 4,
              outline: 'none',
            }}
          />
          <button
            type="button"
            onClick={() => onSearchClose?.()}
            title="Close search · Esc"
            style={{
              padding: '6px 10px',
              border: '1px solid var(--tg-line)',
              borderRadius: 4,
              background: 'transparent',
              color: 'var(--tg-fg2)',
              fontSize: 11,
              fontFamily: 'var(--tg-sans)',
              cursor: 'pointer',
            }}
          >
            Esc
          </button>
        </div>
      )}

      <div className="tg-scroll" style={{ flex: 1, overflowY: 'auto', background: 'var(--tg-bg1)' }}>
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
                style={{
                  borderBottom: i === filtered.length - 1 ? 'none' : '1px solid var(--tg-line)',
                }}
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
                style={{
                  width: '100%',
                  padding: '10px',
                  border: 'none',
                  borderTop: '1px solid var(--tg-line)',
                  background: 'transparent',
                  color: 'var(--tg-fg2)',
                  fontSize: 12,
                  fontFamily: 'var(--tg-sans)',
                  cursor: feed.loadingMore ? 'default' : 'pointer',
                }}
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
