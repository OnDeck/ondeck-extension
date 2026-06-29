import { useEffect, useMemo, useRef, useState } from 'react';
import {
  listNotifications,
  markNotificationRead,
  type NotificationItem,
} from '../../lib/github-api';
import { applyFilter, extractRepositories } from '../../shared/filters/engine';
import type { NotificationFilter } from '../../shared/filters/types';
import { groupNotifications, type GroupBy } from '../../shared/notifications/grouper';
import { prioritizeAll } from '../../shared/notifications/prioritizer';
import { useGitHubQuery } from '../hooks/useGitHubQuery';
import type { ChipId } from './ChipRail';
import { ChipRail } from './ChipRail';
import { FilterPanel } from './FilterPanel';
import { GroupHeader } from './GroupHeader';
import { NotifRow } from './NotifRow';
import { EmptyState, ErrorState, Spinner } from './States';

interface Props {
  token: string;
  onUnreadCountChange: (n: number) => void;
  searchOpen?: boolean;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onSearchClose?: () => void;
}

type GroupByMode = GroupBy | 'none';

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

  const query = useGitHubQuery(
    () => listNotifications(token, { all: true }),
    [token],
  );

  // Live-refresh the list when the background worker reports new
  // notifications, so an open popup stays current without a manual refresh.
  const { refetch } = query;
  useEffect(() => {
    const handleMessage = (message: unknown) => {
      if (
        typeof message === 'object' &&
        message !== null &&
        (message as Record<string, unknown>)['type'] === 'NEW_NOTIFICATIONS'
      ) {
        refetch();
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, [refetch]);

  // Refetch when settings change
  useEffect(() => {
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
      if (area === 'sync' && changes.settings) {
        refetch();
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, [refetch]);

  const [chip, setChip] = useState<ChipId>('all');
  const [groupBy] = useState<GroupByMode>('none');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [markingIds, setMarkingIds] = useState<Set<string>>(new Set());
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [selectedRepos, setSelectedRepos] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const notifications = query.data ?? [];

  // DISABLED: These hooks make hundreds of API calls and are very slow
  // TODO: Make these optional via settings or fetch only for visible notifications
  // const { statusMap } = usePRStatus(token, notifications);
  // const { contextMap } = useNotificationContext(token, notifications);
  const statusMap = { merged: new Set(), closed: new Set(), closedIssues: new Set() };
  const contextMap = new Map();

  const prioritized = useMemo(() => {
    const p = prioritizeAll(notifications);
    onUnreadCountChange(p.filter((n) => n.unread).length);
    return p;
  }, [notifications, onUnreadCountChange]);

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

  const groups = useMemo(
    () =>
      groupBy === 'none'
        ? [{ key: 'all', label: null as string | null, items: filtered }]
        : groupNotifications(filtered, groupBy as GroupBy),
    [filtered, groupBy],
  );

  const toggle = (key: string) =>
    setCollapsed((c) => ({ ...c, [key]: !c[key] }));

  const handleResetFilters = () => {
    setSelectedRepos([]);
    setDateFrom('');
    setDateTo('');
  };

  const activeFilterCount = selectedRepos.length + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0);

  const handleMark = async (item: NotificationItem) => {
    setMarkingIds((prev) => new Set(prev).add(item.id));
    try {
      await markNotificationRead(token, item.id);

      // Trigger background sync to update badge
      chrome.runtime.sendMessage({ type: 'REQUEST_SYNC' }).catch(() => {
        // Ignore if background script isn't ready
      });

      // Refetch notifications after a short delay to get updated unread status
      setTimeout(() => {
        query.refetch();
      }, 500);
    } catch {
      // row stays visible; user can retry
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
        <div style={{ flex: 1 }}>
          <ChipRail active={chip} counts={counts} onChange={setChip} />
        </div>
        <button
          type="button"
          data-testid="filter-button"
          onClick={() => setFilterPanelOpen(true)}
          title="Advanced filters"
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
        {query.status === 'loading' || query.status === 'idle' ? (
          <Spinner />
        ) : query.status === 'error' && query.error ? (
          <ErrorState error={query.error} onRetry={query.refetch} />
        ) : filtered.length === 0 ? (
          <EmptyState />
        ) : (
          groups.map((group) => (
            <div key={group.key}>
              {group.label !== null && (
                <GroupHeader
                  label={group.label ?? ''}
                  count={group.items.length}
                  collapsed={!!collapsed[group.key]}
                  onToggle={() => toggle(group.key)}
                />
              )}
              {!collapsed[group.key] &&
                group.items.map((item, i) => (
                  <div
                    key={item.id}
                    style={{
                      borderBottom:
                        i === group.items.length - 1
                          ? 'none'
                          : '1px solid var(--tg-line)',
                    }}
                  >
                    <NotifRow
                      item={item}
                      marking={markingIds.has(item.id)}
                      onMark={(n) => void handleMark(n)}
                      isMerged={statusMap.merged.has(item.id)}
                      isClosed={statusMap.closed.has(item.id)}
                      isIssueClosed={statusMap.closedIssues.has(item.id)}
                      context={contextMap.get(item.id)}
                    />
                  </div>
                ))}
            </div>
          ))
        )}
      </div>

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
