import { useMemo, useState } from 'react';
import {
  listNotifications,
  markNotificationRead,
  type NotificationItem,
} from '../../lib/github-api';
import { applyFilter, extractRepositories } from '../../shared/filters/engine';
import type { NotificationFilter } from '../../shared/filters/types';
import { groupNotifications, type GroupBy } from '../../shared/notifications/grouper';
import { prioritizeAll } from '../../shared/notifications/prioritizer';
import { useClosedPRDetection } from '../hooks/useClosedPRDetection';
import { useFilterMergedPRs } from '../hooks/useFilterMergedPRs';
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
  searchQuery?: string;
}

type GroupByMode = GroupBy | 'none';

function buildFilter(
  chip: ChipId,
  repos: string[],
  dateFrom: string,
  dateTo: string,
): NotificationFilter {
  const base: NotificationFilter = {};

  // Chip filter
  switch (chip) {
    case 'all':      base.subjectTypes = ['PullRequest', 'Issue']; break;
    case 'unread':   base.unreadOnly = true; break;
    case 'prs':      base.subjectTypes = ['PullRequest']; break;
    case 'issues':   base.subjectTypes = ['Issue']; break;
    case 'reviews':  base.reasons = ['review_requested']; break;
    case 'mentions': base.reasons = ['mention', 'team_mention']; break;
    case 'assigned': base.reasons = ['assign']; break;
    case 'ci':       base.reasons = ['ci_activity']; break;
    case 'security': base.reasons = ['security_alert']; break;
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
  return {
    all:      items.filter((n) => n.subject.type === 'PullRequest' || n.subject.type === 'Issue').length,
    unread:   items.filter((n) => n.unread).length,
    prs:      items.filter((n) => n.subject.type === 'PullRequest').length,
    issues:   items.filter((n) => n.subject.type === 'Issue').length,
    reviews:  items.filter((n) => n.reason === 'review_requested').length,
    mentions: items.filter((n) => n.reason === 'mention' || n.reason === 'team_mention').length,
    assigned: items.filter((n) => n.reason === 'assign').length,
    ci:       items.filter((n) => n.reason === 'ci_activity').length,
    security: items.filter((n) => n.reason === 'security_alert').length,
  };
}

export function Notifications({ token, onUnreadCountChange, searchQuery = '' }: Props) {
  const query = useGitHubQuery(() => listNotifications(token, { all: true }), [token]);

  const [chip, setChip] = useState<ChipId>('all');
  const [groupBy] = useState<GroupByMode>('priority');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [markingIds, setMarkingIds] = useState<Set<string>>(new Set());
  const [locallyRead, setLocallyRead] = useState<Set<string>>(new Set());
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [selectedRepos, setSelectedRepos] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Filter out notifications for merged PRs
  const { filtered: nonMergedNotifs, loading: checkingMerged } = useFilterMergedPRs(
    token,
    query.data ?? [],
  );

  // Detect closed (non-merged) PRs
  const { closedPRs } = useClosedPRDetection(token, nonMergedNotifs);

  const prioritized = useMemo(() => {
    // Filter out locally read notifications (keep closed items to show with tag)
    const raw = nonMergedNotifs.filter((n) => !locallyRead.has(n.id));
    const p = prioritizeAll(raw);
    onUnreadCountChange(p.filter((n) => n.unread).length);
    return p;
  }, [nonMergedNotifs, locallyRead, onUnreadCountChange]);

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
      setLocallyRead((prev) => new Set(prev).add(item.id));
      // Trigger background sync to update badge
      chrome.runtime.sendMessage({ type: 'REQUEST_SYNC' }).catch(() => {
        // Ignore if background script isn't ready
      });
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

      <div className="tg-scroll" style={{ flex: 1, overflowY: 'auto', background: 'var(--tg-bg1)' }}>
        {checkingMerged && filtered.length === 0 && (
          <div style={{ padding: 8, fontSize: 12, color: 'var(--tg-text-muted)', textAlign: 'center' }}>
            Checking PR status...
          </div>
        )}
        {query.status === 'loading' || query.status === 'idle' ? (
          <Spinner />
        ) : query.status === 'error' && query.error ? (
          <ErrorState error={query.error} onRetry={query.refetch} />
        ) : !checkingMerged && filtered.length === 0 ? (
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
                      isClosed={closedPRs.has(item.id)}
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
